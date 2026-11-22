"""Local report integration; all network reads and Telegram sends are stubbed."""
import json, os, runpy, sys, unittest
from pathlib import Path
from unittest.mock import patch
base=Path(os.environ.get('FINFOLIO_TEST_SCRIPTS',Path(__file__).resolve().parents[1]/'outputs/finfolio-vps/scripts'))
sys.path.insert(0,str(base))
import lib

class NotificationIntegration(unittest.TestCase):
    def test_reports_include_scheme_once_and_suppress_legacy_rd(self):
        gold={'version':1,'schemes':[{'id':'rd:42','name':'Tanishq','monthly':10000,'instalments':10,'startMonth':'2026-08','deadlineDay':31,'dropPct':1}], 'payments':[{'id':'p1','schemeId':'rd:42','month':'2026-08','amount':10000},{'id':'p2','schemeId':'rd:42','month':'2026-09','amount':10000}], 'migrations':[{'sourceId':42}]}
        data={'mypf_rds':[{'id':42,'bank':'Tanishq','monthly':10000,'paidMonths':2,'matAmt':105000,'maturity':'2026-10-01'}],'mypf_gold_schemes_v1':gold}
        for name in ['morning-digest.py','weekly-digest.py','gold-check.py','reminders.py']:
            messages=[]
            with self.subTest(report=name), patch.object(lib,'fetch_supabase',side_effect=lambda keys:{k:data.get(k) for k in keys}),patch.object(lib,'get_gold_inr_per_gram',return_value=(10000,'synthetic fixture')),patch.object(lib,'get_tanishq_quote',return_value=None),patch.object(lib,'_http_get',return_value={}),patch.object(lib,'send_telegram',side_effect=lambda text,*args,**kwargs:messages.append(text) or True):
                module=runpy.run_path(str(base/name));self.assertEqual(module['main'](),0)
                text='\n'.join(messages)
                self.assertNotIn('1.05L',text)
                if name in ['morning-digest.py','weekly-digest.py']:
                    self.assertEqual(text.count('Gold schemes'),1)
                    self.assertIn('20,000',text)
                if name=='gold-check.py':self.assertIn('comparison unavailable',text)

if __name__=='__main__':unittest.main()
