import sys
import unittest
from pathlib import Path
from datetime import date
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'jobs'))
from finance_records import *

class SchemeReaderTests(unittest.TestCase):
    def setUp(self):
        self.scheme={'id':'rd:42','name':'Tanishq','monthly':10000,'instalments':10,'startMonth':'2026-08','deadlineDay':31,'dropPct':1}
        self.gold={'version':1,'schemes':[self.scheme],'migrations':[{'sourceId':42}],'payments':[{'id':f'p{i}','schemeId':'rd:42','month':m,'amount':10000} for i,m in enumerate(['2026-08','2026-09'])]}
    def test_duplicate_rd_suppressed_even_if_cloud_still_contains_it(self):
        self.assertEqual(active_rds([{'id':42},{'id':43}],self.gold),[{'id':43}])
        self.assertEqual(scheme_cost(self.gold),20000)
        self.assertEqual(sum(x['remaining'] for x in instalments(self.scheme,self.gold)),80000)
    def test_reminder_window_and_overdue_and_partial(self):
        self.assertEqual(reminder_items(self.gold,date(2026,10,20)),[])
        self.assertEqual(len(reminder_items(self.gold,date(2026,10,21))),1)
        self.gold['payments'].append({'schemeId':'rd:42','month':'2026-10','amount':4000})
        self.assertEqual(reminder_items(self.gold,date(2026,11,1))[0][2],6000)
        self.gold['payments'].append({'schemeId':'rd:42','month':'2026-10','amount':6000})
        self.assertEqual(reminder_items(self.gold,date(2026,11,1)),[])
    def test_boundary_drop_missing_stale_and_paid(self):
        q={'fresh':True,'source':'Tanishq','purity':'22K','today':{'date':'2026-10-01','rate':9900},'yesterday':{'date':'2026-09-30','rate':10000}}
        self.assertEqual(len(drop_alerts(self.gold,q,date(2026,10,1))),1)
        q['today']['rate']=9900.01
        self.assertEqual(drop_alerts(self.gold,q,date(2026,10,1)),[])
        q['today']['rate']=9900;q['fresh']=False
        self.assertEqual(drop_alerts(self.gold,q,date(2026,10,1)),[])
        q['fresh']=True;q['yesterday']['date']='2026-09-29'
        self.assertEqual(drop_alerts(self.gold,q,date(2026,10,1)),[])
        q['yesterday']['date']='2026-09-30'
        self.gold['payments'].append({'schemeId':'rd:42','month':'2026-10','amount':10000})
        self.assertEqual(drop_alerts(self.gold,q,date(2026,10,1)),[])
    def test_redemption_and_interrupted_physical_write(self):
        self.scheme['redeemed']={'id':'scheme:rd:42','sourceSchemeId':'rd:42','grams':8,'pureGrams':8*22/24}
        self.assertEqual(scheme_cost(self.gold),0)
        holdings=physical_holdings([],self.gold)
        self.assertEqual(len(physical_holdings(holdings,self.gold)),1)
        self.assertEqual(reminder_items(self.gold,date(2026,11,1)),[])
    def test_old_backup_and_unknown_version(self):
        self.assertEqual(scheme_cost(gold_data({})),0)
        with self.assertRaises(ValueError):gold_data({GOLD_KEY:{'version':2}})
    def test_leap_year_clamp_and_effective_amounts(self):
        self.scheme['startMonth']='2028-01';self.scheme['amounts']=[{'month':'2028-03','amount':12000}]
        slots=list(instalments(self.scheme,self.gold))
        self.assertEqual(slots[1]['due'],date(2028,2,29))
        self.assertEqual(slots[1]['remaining'],10000)
        self.assertEqual(slots[2]['remaining'],12000)

if __name__=='__main__':unittest.main()
