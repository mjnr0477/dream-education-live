"use strict";

function unique(values){return [...new Set(values.filter(Boolean))];}

function buildCommercialIntelligence(data={}, now=new Date()){
  const payments=Array.isArray(data.payments)?data.payments:[];
  const successful=payments.filter(p=>p.status==="successful"&&!p.owner_exempt&&Number(p.amount)>0);
  const customers=unique(successful.map(p=>p.account_id||p.learner_id));
  const revenue=successful.reduce((s,p)=>s+Number(p.amount||0),0);
  const byPlan=new Map();
  for(const p of successful){
    const plan=String(p.plan_id||"unknown");
    const row=byPlan.get(plan)||{plan_id:plan,transactions:0,revenue:0,customers:new Set()};
    row.transactions++;
    row.revenue+=Number(p.amount||0);
    const id=p.account_id||p.learner_id;
    if(id)row.customers.add(id);
    byPlan.set(plan,row);
  }
  const plans=[...byPlan.values()].map(r=>({
    plan_id:r.plan_id,
    transactions:r.transactions,
    revenue:Number(r.revenue.toFixed(2)),
    customers:r.customers.size,
    average_transaction:Number((r.revenue/r.transactions).toFixed(2))
  }));
  const periods=successful.map(p=>Number(p.billing_period_days||0)).filter(Number.isFinite);
  const recurringMonthly=successful.reduce((s,p)=>{
    const a=Number(p.amount||0),d=Number(p.billing_period_days||0);
    if(d===30)return s+a;
    if(d===365)return s+a/12;
    if(d===7)return s+a*52/12;
    if(d===1)return s+a*365/12;
    return s;
  },0);
  return {
    version:"1.0.0",
    generated_at:now.toISOString(),
    commercial_signal:{
      paying_customers:customers.length,
      successful_transactions:successful.length,
      total_revenue:Number(revenue.toFixed(2)),
      currency:"KES",
      annualized_recurring_revenue:Number((recurringMonthly*12).toFixed(2))
    },
    plan_mix:plans,
    billing_evidence:{
      recurring_transactions:periods.filter(d=>d>0).length,
      one_off_transactions:periods.filter(d=>d===0).length
    },
    evidence_status:successful.length===0?"no_payment_evidence":customers.length===1?"early_commercial_evidence":"commercial_evidence_available"
  };
}
module.exports={buildCommercialIntelligence};
