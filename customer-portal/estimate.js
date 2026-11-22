/* Shared estimate arithmetic. All amounts are integer cents. */
(() => {
 const packages={2:{package_cents:39500,hourly_rate_cents:15900},3:{package_cents:49500,hourly_rate_cents:18900},4:{package_cents:69500,hourly_rate_cents:24900}};
 function details(record){
  if(record.estimate_details&&Object.keys(record.estimate_details).length)return record.estimate_details;
  const p=record.planning_estimate||{},rate=!p.custom_quote_required?packages[p.suggested_movers]:null;
  return {movers:p.suggested_movers||null,trucks:typeof p.trucks==='number'?p.trucks:null,hours_low:p.estimated_hours?.[0]??null,hours_high:p.estimated_hours?.[1]??null,hourly_rate_cents:rate?.hourly_rate_cents??null,package_cents:rate?.package_cents??null,package_hours:rate?2:0,services:[]};
 }
 function totals(q){
  const complete=Number.isFinite(q.hours_low)&&Number.isFinite(q.hours_high)&&Number.isInteger(q.hourly_rate_cents);
  const labor=h=>q.package_cents==null?Math.round(h*q.hourly_rate_cents):q.package_cents+Math.round(Math.max(0,h-(q.package_hours||0))*q.hourly_rate_cents);
  const serviceTotals=(q.services||[]).map(s=>s.unit_price_cents==null?null:Math.round(s.quantity*s.unit_price_cents));
  const additional=serviceTotals.some(n=>n===null)?null:serviceTotals.reduce((a,b)=>a+b,0);
  const low=complete?labor(q.hours_low):null,high=complete?labor(q.hours_high):null;
  return {labor_low:low,labor_high:high,serviceTotals,additional,total_low:low===null||additional===null?null:low+additional,total_high:high===null||additional===null?null:high+additional};
 }
 window.HaulBrosEstimate=Object.freeze({packages,details,totals});
})();
