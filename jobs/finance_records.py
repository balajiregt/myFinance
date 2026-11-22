"""Version-1 FinFolio gold reader, shared by deterministic notification jobs.

No credentials, AI calls or delivery side effects. Dates are calendar dates in IST.
"""
import calendar
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

GOLD_KEY = 'mypf_gold_schemes_v1'


def gold_data(data):
    gold = data.get(GOLD_KEY) or {'version': 1, 'schemes': [], 'payments': [], 'migrations': []}
    if gold.get('version') != 1:
        raise ValueError('Unsupported gold scheme version')
    return gold


def active_rds(rows, gold):
    migrated = {str(x['sourceId']) for x in gold.get('migrations', [])}
    return [r for r in rows if str(r.get('id')) not in migrated]


def physical_holdings(rows, gold):
    """Recover the physical leg if an older cloud client missed the second write."""
    result = list(rows)
    for scheme in gold.get('schemes', []):
        holding = scheme.get('redeemed')
        if holding and not any(x.get('sourceSchemeId') == scheme['id'] or x.get('id') == holding['id'] for x in result):
            result.append(holding)
    return result


def payments(gold, scheme):
    return [p for p in gold.get('payments', []) if p.get('schemeId') == scheme['id'] and not p.get('voided')]


def amount_at(scheme, month):
    revisions = sorted([r for r in scheme.get('amounts', []) if r['month'] <= month], key=lambda r: r['month'], reverse=True)
    return float(revisions[0]['amount'] if revisions else scheme['monthly'])


def instalments(scheme, gold):
    year, month = map(int, scheme['startMonth'].split('-'))
    for i in range(int(scheme['instalments'])):
        y, m0 = divmod(year * 12 + month - 1 + i, 12)
        key = f'{y:04d}-{m0 + 1:02d}'
        due = date(y, m0 + 1, min(int(scheme.get('deadlineDay') or 31), calendar.monthrange(y, m0 + 1)[1]))
        paid = round(sum(float(p['amount']) for p in payments(gold, scheme) if p['month'] == key), 2)
        remaining = max(0, round(amount_at(scheme, key) - paid, 2))
        yield {'month': key, 'due': due, 'paid': paid, 'remaining': remaining}


def scheme_cost(gold):
    return sum(sum(float(p['amount']) for p in payments(gold, s)) for s in gold.get('schemes', []) if not s.get('redeemed'))


def reminder_items(gold, today=None):
    today = today or datetime.now(ZoneInfo('Asia/Kolkata')).date()
    cutoff = today + timedelta(days=10)
    result = []
    for s in gold.get('schemes', []):
        if s.get('redeemed'):
            continue
        for p in instalments(s, gold):
            if p['remaining'] and p['month'] <= today.strftime('%Y-%m') and p['due'] <= cutoff:
                result.append(('Gold instalment', f"{s['name']} · {p['month']}", p['remaining'], p['due']))
    return result


def drop_alerts(gold, quote, today=None):
    today = today or datetime.now(ZoneInfo('Asia/Kolkata')).date()
    previous = today - timedelta(days=1)
    if not (quote and quote.get('fresh') and quote.get('source') == 'Tanishq' and quote.get('purity') == '22K'):
        return []
    current, yesterday = quote.get('today') or {}, quote.get('yesterday') or {}
    if current.get('date') != today.isoformat() or yesterday.get('date') != previous.isoformat():
        return []
    if not (float(current.get('rate') or 0) > 0 and float(yesterday.get('rate') or 0) > 0):
        return []
    change = (float(current['rate']) / float(yesterday['rate']) - 1) * 100
    result = []
    for s in gold.get('schemes', []):
        if s.get('redeemed'):
            continue
        slot = next((p for p in instalments(s, gold) if p['month'] == today.strftime('%Y-%m')), None)
        if slot and slot['remaining'] and change <= -float(s.get('dropPct', 1)) + 1e-9:
            result.append({'schemeId': s['id'], 'name': s['name'], 'date': today.isoformat(), 'changePct': change,
                           'remaining': slot['remaining'], 'rate': current['rate'], 'estimatedGrams': slot['remaining'] / float(current['rate'])})
    return result


def scheme_value(gold, quote=None, today=None):
    today = today or datetime.now(ZoneInfo('Asia/Kolkata')).date()
    valid = quote and quote.get('fresh') and quote.get('source') == 'Tanishq' and quote.get('purity') == '22K' and (quote.get('today') or {}).get('date') == today.isoformat() and float((quote.get('today') or {}).get('rate') or 0) > 0
    total = 0
    for scheme in gold.get('schemes', []):
        if scheme.get('redeemed'):
            continue
        rows = payments(gold, scheme)
        if valid and rows and all(float(p.get('grams') or 0) > 0 for p in rows):
            total += sum(float(p['grams']) for p in rows) * float(quote['today']['rate'])
        else:
            total += sum(float(p['amount']) for p in rows)
    return round(total, 2)
