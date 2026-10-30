from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent/'python_packages'))
import numpy as np,pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
M=ROOT/'measurements';OUT=ROOT/'analysis';OUT.mkdir(exist_ok=True)
r=pd.DataFrame(json.loads((M/'all_rows.json').read_text()));t=json.loads((M/'trials.json').read_text())
assert len(t)==40 and len(r)==1680
assert all(x['api_count']==42 and x['total_records']==500 and x['api_errors']==0 and not x['browser_errors'] for x in t)
run=[]
for tr in t:
 q=r[r.run_id==tr['run_id']].sort_values('page');last=q.iloc[-1]
 run.append({'run_id':tr['run_id'],'pair':tr['pair'],'mode':tr['mode'],'heap_final_mib':last.heap_after_gc_bytes/1048576,'heap_initial_mib':q.iloc[0].heap_after_gc_bytes/1048576,'final_cards':last.cards,'final_elements':last.document_elements,'browsing_task_ms':q[q.page>1].task_since_previous_s.sum()*1000,'batch_ready_mean_ms':q[q.page>1].batch_ready_ms.mean(),'batch_ready_median_ms':q[q.page>1].batch_ready_ms.median(),'fcp_ms':tr['paint']['fcp'],'initial_ready_ms':tr['initial_batch_ready_ms'],'initial_lcp_ms':tr['paint']['lcp_entries'][0]['startTime'] if tr['paint']['lcp_entries'] else np.nan,'api_count':tr['api_count'],'api_errors':tr['api_errors'],'records':tr['total_records']})
 run[-1]['style_layout_ms']=((last.layout_duration_s-q.iloc[0].layout_duration_s)+(last.recalc_duration_s-q.iloc[0].recalc_duration_s))*1000
u=pd.DataFrame(run);r.to_csv(OUT/'all_batches.csv',index=False);u.to_csv(OUT/'all_runs.csv',index=False)
summ=[];contrasts=[];rng=np.random.default_rng(291026)
metrics=['heap_final_mib','heap_initial_mib','final_cards','final_elements','browsing_task_ms','batch_ready_mean_ms','fcp_ms','initial_ready_ms','initial_lcp_ms','style_layout_ms']
for metric in metrics:
 for mode,g in u.groupby('mode'):
  s=g[metric];summ.append({'metric':metric,'mode':mode,'n':len(s),'mean':s.mean(),'median':s.median(),'sd':s.std(),'min':s.min(),'max':s.max()})
 wide=u.pivot(index='pair',columns='mode',values=metric);d=(wide['infinite']-wide['pagination']).to_numpy();boot=rng.choice(d,size=(10000,len(d)),replace=True).mean(axis=1)
 contrasts.append({'metric':metric,'paired_difference_mean':d.mean(),'paired_difference_sd':d.std(ddof=1),'ci_low':np.quantile(boot,.025),'ci_high':np.quantile(boot,.975),'exclude_pair1_mean_difference':d[1:].mean()})
pd.DataFrame(summ).to_csv(OUT/'summary.csv',index=False);pd.DataFrame(contrasts).to_csv(OUT/'paired_contrasts.csv',index=False)
stats={'trials':40,'pairs':20,'batches':1680,'http_errors':sum(x['api_errors'] for x in t),'summary':summ,'contrasts':contrasts}
(OUT/'statistics.json').write_text(json.dumps(stats,indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))
plt.rcParams.update({'font.family':'Arial','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'axes.grid':True,'grid.color':'.9','axes.axisbelow':True})
style={'pagination':('black','o','Pagination'),'infinite':('.5','s','Infinite scroll')}
def save(fig,n):fig.tight_layout();fig.savefig(OUT/f'figure_{n}.png',dpi=220,bbox_inches='tight');plt.close(fig)
fig,axs=plt.subplots(1,2,figsize=(7,3))
for mode,(c,m,l) in style.items():
 for ax,metric,label in zip(axs,['cards','document_elements'],['Retained cards','Document elements']):
  g=r[r['mode'].eq(mode)&r.checkpoint].groupby('loaded_records')[metric].agg(['mean','std']);ax.errorbar(g.index,g['mean'],yerr=g['std'],color=c,marker=m,label=l,capsize=3);ax.set(xlabel='Cumulative delivered records',ylabel=label)
axs[0].legend(frameon=False,fontsize=8);save(fig,1)
fig,ax=plt.subplots(figsize=(7,3.2))
for mode,(c,m,l) in style.items():
 g=r[r['mode'].eq(mode)&r.checkpoint].assign(mib=lambda x:x.heap_after_gc_bytes/1048576).groupby('loaded_records').mib.agg(['mean','std']);ax.errorbar(g.index,g['mean'],yerr=g['std'],color=c,marker=m,label=l,capsize=3)
ax.set(xlabel='Cumulative delivered records',ylabel='Post-GC live JS heap (MiB)');ax.legend(frameon=False);save(fig,2)
for n,metric,label in [(3,'heap_final_mib','Final post-GC JS heap (MiB)'),(4,'browsing_task_ms','Main-thread task time over batches 2 to 42 (ms)'),(5,'batch_ready_mean_ms','Run mean batch-ready latency (ms)'),(6,'fcp_ms','First Contentful Paint (ms)')]:
 fig,ax=plt.subplots(figsize=(7,3.2));wide=u.pivot(index='pair',columns='mode',values=metric)
 for _,row in wide.iterrows():ax.plot([0,1],[row.pagination,row.infinite],color='.8',lw=.7)
 for x,mode in enumerate(['pagination','infinite']):
  c,m,l=style[mode];vals=wide[mode].to_numpy();j=np.linspace(-.06,.06,len(vals));ax.scatter(x+j,vals,color=c,marker=m,s=23);ax.hlines(vals.mean(),x-.14,x+.14,color='black',lw=2)
 ax.set(xticks=[0,1],xticklabels=['Pagination','Infinite scroll'],ylabel=label,xlim=(-.4,1.4));save(fig,n)
print(pd.DataFrame(summ).to_string(index=False));print(pd.DataFrame(contrasts).to_string(index=False))
