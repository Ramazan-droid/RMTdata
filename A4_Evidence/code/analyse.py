from pathlib import Path
import sys,csv,json,hashlib,shutil
sys.path.insert(0,str(Path(__file__).parent/'python_packages'))
import numpy as np,pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

SCRIPT=Path(__file__).resolve()
PORTABLE=SCRIPT.parent.name=='code'
ROOT=SCRIPT.parent.parent if PORTABLE else SCRIPT.parent
OUT=ROOT if PORTABLE else ROOT/'a4_evidence'
for sub in ['raw','processed','figures','code','audit']:(OUT/sub).mkdir(parents=True,exist_ok=True)
repo=ROOT/('source_snapshot' if PORTABLE else 'repo'); sha=json.loads((ROOT/'repo_snapshot.json').read_text())['sha']
manifest=[]
for f in (repo/'data/raw').glob('*.csv'):
 shutil.copy2(f,OUT/'raw'/f.name)
 manifest.append({'path':'data/raw/'+f.name,'commit':sha,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'url':f'https://github.com/Ramazan-droid/RMTdata/blob/{sha}/data/raw/{f.name}'})
lines=(repo/'data/raw/backend_metrics.csv').read_text().splitlines()
rows=[]
for line_no,line in enumerate(lines[1:],2):
 parts=line.split(',',5)
 if len(parts)!=6:raise ValueError(line_no)
 rows.append(parts+[line_no,len(line.split(','))])
b=pd.DataFrame(rows,columns=['run_id','page_type','metric_name','raw_value','unit','query','source_line','naive_columns'])
b['value']=pd.to_numeric(b.raw_value,errors='coerce')
b['metric']=np.select([b.metric_name.eq('http_request_duration_seconds'),b.metric_name.eq('items_requests_per_session'),b.metric_name.eq('items_response_kb_per_session'),b['query'].str.startswith('histogram_quantile')],['http_p95','requests_ratio','kib_ratio','client_p95'],default='client_mean')
b['status']=np.where(b.value.isna(),'invalid_numeric','retained_descriptive')
b.to_csv(OUT/'processed/backend_all_records.csv',index=False)
b[b.value.notna()].to_csv(OUT/'processed/backend_valid.csv',index=False)
f=pd.read_csv(repo/'data/raw/frontend_metrics.csv')
f['source_line']=np.arange(2,len(f)+2);f['original_value']=f.value
mask=f.website.eq('GitHub')&f.strategy.eq('mobile')&f.metric_name.eq('CLS')
assert mask.sum()==1 and f.loc[mask,'value'].iat[0]==.27
f.loc[mask,'value']=.29
f['correction']=np.where(mask,'0.27 to 0.29; screenshots.pdf page 8 upper image','none')
f['primary_include']=f.website.ne('Google')
f.to_csv(OUT/'processed/frontend_all_records.csv',index=False)
f[f.primary_include].to_csv(OUT/'processed/frontend_primary.csv',index=False)
bs=b.groupby(['page_type','metric']).value.agg(['count','mean','median','std','min','max']).reset_index()
fs=f[f.primary_include].groupby(['page_type','strategy','metric_name']).value.agg(['count','mean','median','std','min','max']).reset_index()
bs.to_csv(OUT/'processed/backend_summary.csv',index=False);fs.to_csv(OUT/'processed/frontend_summary.csv',index=False)
sens=[]
for label,ff in [('original_csv',f.assign(value=f.original_value)),('screen_corrected_all',f),('exclude_google',f[f.primary_include]),('exclude_google_and_unsupported_desktop',f[f.primary_include&~(f.strategy.eq('desktop')&f.website.isin(['Amazon','eBay']))])]:
 for device in ['mobile','desktop']:
  for metric in ['LCP','FCP','INP','CLS','TTFB']:
   a=ff[(ff.strategy==device)&(ff.metric_name==metric)]
   pg=a[a.page_type=='pagination'].value;inf=a[a.page_type=='infinite_scroll'].value
   sens.append({'scenario':label,'strategy':device,'metric_name':metric,'pagination_n':len(pg),'infinite_n':len(inf),'pagination_mean':pg.mean(),'infinite_mean':inf.mean(),'difference_infinite_minus_pagination':inf.mean()-pg.mean()})
pd.DataFrame(sens).to_csv(OUT/'processed/sensitivity.csv',index=False)
pivot=b.pivot(index=['page_type','run_id'],columns='metric',values='value').reset_index()
pivot.to_csv(OUT/'processed/all_snapshot_table.csv',index=False)
audit={'commit':sha,'backend_rows':len(b),'backend_valid_values':int(b.value.notna().sum()),'backend_invalid_values':int(b.value.isna().sum()),'backend_unescaped_query_rows':int((b.naive_columns>6).sum()),'backend_snapshots_per_label':b.groupby('page_type').run_id.nunique().to_dict(),'frontend_raw_rows':len(f),'frontend_primary_rows':int(f.primary_include.sum()),'frontend_sites':int(f.website.nunique()),'frontend_profiles':int(len(f[['website','strategy']].drop_duplicates())),'frontend_corrections':int(mask.sum()),'frontend_excluded_google_rows':int((~f.primary_include).sum()),'original_empty_cells_backend':int(b[['run_id','page_type','metric_name','raw_value','unit','query']].eq('').sum().sum()),'exact_duplicate_backend_rows':int(b[['run_id','page_type','metric_name','raw_value','unit','query']].duplicated().sum()),'exact_duplicate_frontend_rows':int(f.iloc[:,:8].duplicated().sum()),'backend_missing_rate':float(b.value.isna().mean()*100),'independent_backend_trial_count':'not identifiable from cumulative snapshots','frontend_repeated_identical_url_profile_trials':1}
(OUT/'audit/counts.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
(OUT/'audit/source_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
plt.rcParams.update({'font.family':'Arial','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'axes.grid':True,'grid.color':'.9','grid.linewidth':.5,'axes.axisbelow':True,'savefig.facecolor':'white'})
def save(fig,n):
 fig.tight_layout();fig.savefig(OUT/f'figures/figure_{n}.png',dpi=220,bbox_inches='tight');plt.close(fig)
styles={'pagination':('black','o','Pagination'),'infinite':('.5','s','Infinite scroll')}
fig,ax=plt.subplots(figsize=(7,3.2))
for mode,(color,mark,label) in styles.items():
 x=b[(b.page_type==mode)&(b.metric=='http_p95')].copy();ax.plot(x.run_id.astype(int),x.value*1000,color=color,marker=mark,ms=4,label=label)
ax.set(xlabel='Stored snapshot index (not an independent trial)',ylabel='HTTP p95 estimate (ms)');ax.legend(frameon=False);save(fig,1)
fig,axs=plt.subplots(1,2,figsize=(7,3.0))
for ax,metric,title in zip(axs,['client_mean','client_p95'],['Cumulative mean','Cumulative p95 estimate']):
 for mode,(color,mark,label) in styles.items():
  x=b[(b.page_type==mode)&(b.metric==metric)];ax.plot(x.run_id.astype(int),x.value*1000,color=color,marker=mark,ms=3,label=label)
 ax.set(title=title,xlabel='Snapshot index',ylabel='Client load latency (ms)')
axs[0].legend(frameon=False,fontsize=8);save(fig,2)
fig,axs=plt.subplots(1,2,figsize=(7,3))
for mode,(color,mark,label) in styles.items():
 x=pivot[pivot.page_type==mode]
 axs[0].plot(x.run_id.astype(int),x.requests_ratio,color=color,marker=mark,ms=3,label=label)
 axs[1].plot(x.run_id.astype(int),x.kib_ratio,color=color,marker=mark,ms=3,label=label)
axs[0].set(xlabel='Snapshot index',ylabel='Cumulative requests / session starts');axs[1].set(xlabel='Snapshot index',ylabel='Cumulative KiB / session starts');axs[0].legend(frameon=False,fontsize=8);save(fig,3)
order=['Amazon','eBay','Wikipedia','GitHub','Instagram','TikTok','Pinterest','YouTube','Facebook']
for num,metric,unit in [(4,'LCP','s'),(5,'INP','ms'),(6,'CLS','unitless')]:
 fig,ax=plt.subplots(figsize=(7,3.8));q=f[f.primary_include&f.metric_name.eq(metric)].pivot(index='website',columns='strategy',values='value').loc[order]
 for i,site in enumerate(order):ax.plot([q.loc[site,'mobile'],q.loc[site,'desktop']],[i,i],color='.7',lw=1)
 ax.scatter(q.mobile,range(len(q)),marker='o',c='black',label='Mobile',s=35)
 ax.scatter(q.desktop,range(len(q)),marker='s',facecolors='white',edgecolors='black',label='Desktop',s=35)
 ax.axhline(3.5,color='.5',linestyle='--',lw=.8)
 ax.set(yticks=range(len(q)),yticklabels=order,xlabel=f'{metric} ({unit})',ylabel='Site label; upper four pagination, lower five infinite scroll')
 ax.invert_yaxis();ax.legend(frameon=False,fontsize=9)
 if metric=='CLS':ax.annotate('Screenshot correction 0.29',xy=(.29,3),xytext=(.38,2.3),fontsize=8,arrowprops={'arrowstyle':'->','color':'black'})
 save(fig,num)
fig,axs=plt.subplots(1,2,figsize=(7,3.2));s=pd.DataFrame(sens)
for ax,metric,unit in zip(axs,['LCP','TTFB'],['s','s']):
 for device,mark,col in [('mobile','o','black'),('desktop','s','.5')]:
  x=s[(s.strategy==device)&(s.metric_name==metric)&s.scenario.isin(['original_csv','screen_corrected_all','exclude_google'])]
  ax.plot(range(3),x.difference_infinite_minus_pagination,color=col,marker=mark,label=device.capitalize())
 ax.axhline(0,color='black',lw=.8);ax.set(xticks=range(3),xticklabels=['Original','Corrected','No Google'],ylabel=f'Infinite minus pagination mean {metric} ({unit})')
 ax.tick_params(axis='x',labelsize=8)
axs[0].legend(frameon=False,fontsize=8);save(fig,7)
if not PORTABLE:shutil.copy2(__file__,OUT/'code/analyse.py')
print(json.dumps(audit,indent=2));print(bs.to_string(index=False));print(fs.to_string(index=False))
