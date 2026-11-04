// Plain-English plan content. Every line traces to a research file in /workspace/mb-market-research.
export const paths = {
 mid: {
  title:"Mid-size churches", range:"Weekly attendance 250–999", tag:"Core focus",
  answer:"Start here. Lead with ease and human support, close with one trusted money record, and be honest that the switch tools are not built yet.",
  facts:[["~10k–25k","US churches (estimate)"],["~25–30%","of churchgoers"],["62%","of churches over 250 are growing"],["$700k–$1.7M","median yearly income, 251–1,500 size buckets (2019)"]],
  tabs:{
   "Win / lose":{win:["Ease for office staff and volunteers","A real person who answers","Fund accounting, payroll and payables in one vendor (Planning Center, Tithely and Subsplash lack this)"],lose:["Pushpay has a public switching dashboard; we don't yet","Older Fellowship One reviews are negative on ease and reports","Two different customer counts on our site (90,000 vs 55,000)"]},
   "Who we sell":["Senior pastor signs and approves any change to how the church asks for money","Church administrator or executive pastor evaluates, uses it daily and can veto","Treasurer or finance lead must approve giving: processor, deposits, fees, audit trail","Board ratifies multi-year or larger contracts","Low end (250–400) runs like a small church: admin + treasurer. High end (700–999): executive pastor + finance staff"],
   "How we attack":["Sales reps for mid-size churches call first; account executives close","Open on three-year total cost and the cost of moving — never by matching free giving","Put software, processing, staff time and migration risk on one page over 36 months","A demo counts only when it is held and the finance lead, executive pastor or systems admin is present","Bring a treasurer packet to every giving conversation: dated cutover, donor re-sign-up plan, audit trail","Pushpay customers: reach out 90–120 days before renewal"],
   "Proof":["Use stories from one-campus, multi-service churches — not megachurch logo walls","Today we can truthfully sell: guided recurring-gift move + fund accounting in one vendor","Nobody in the market shows a named church with a dated switch and gifts kept — the first to publish one owns it"],
   "Open items":["R1 switching progress screen","R2 gift-to-books demo","R3 current ease and support proof","R5 spoken starting price","R6 attendance data quality"],
   "Next moves":["Fix the front door: one promise, one customer count, a working pricing page","Ship the switching progress screen and finance sign-off","Record gift → person → deposit → fund on the product we sell","Collect 30+ current independent reviews","Size churches by public signals (service count, staff page), not the CRM default"]}},
 large: {
  title:"Large churches", range:"Weekly attendance 1,000+", tag:"Commercial Plus / Enterprise",
  answer:"Treat as a named-account plan. Fewer, bigger, slower deals won through formal reviews, multi-campus needs and finance rigor — where Pushpay's proof is strongest and ours must be built.",
  facts:[["~1,750","Protestant churches at 2,000+"],["70%","of 2,000+ churches are multisite"],["$5.3M","median budget at 2,000+"],["27%","of churchgoers attend 1,501+ churches — the largest single slice"]],
  tabs:{
   "Win / lose":{win:["Fund accounting, payroll and payables in one vendor — matters to audited finance teams","Softer lock-in than Pushpay's 1–3 year terms","Run-both-systems path: keep their people system while giving moves"],lose:["Pushpay owns large-church proof and the public switching dashboard","ACS/Realm is near parity on accounting and has denominational channels","No large-church win/loss data at a usable sample (R4)"]},
   "Who we sell":["Senior leadership and board: 83% of megachurches have boards drawn from the church","Executive pastor and finance team — 78% are CPA-audited","Campus and IT leads where the church is multisite","Formal request-for-information process is common at this size"],
   "How we attack":["1,000–1,999: account-executive hunters with Plus sales-rep support","2,000+: named accounts owned by the Plus / Enterprise team","Lead with migration safety, one money record, accounting depth and an implementation concierge","Compete head-on with Pushpay Complete and Realm Multiply","Answer formal reviews with a finance-ready packet, not a demo alone","Time outreach to renewal windows"],
   "Proof":["Large-church references with multi-campus and audited finance","A switching dashboard at least as clear as Pushpay's (not built — R1)","Named switch story with dated outcome (no vendor has one yet)"],
   "Open items":["R1 switching progress screen","R2 gift-to-books demo","R4 win/loss vs Pushpay","R7 owners and dates","Unknown: who owns the Plus / Enterprise playbook (core plan lists it as a separate owner)","Unknown: attendee share and count for 1,000–1,999"],
   "Next moves":["Name an owner for the Plus / Enterprise playbook","Build the named-account list from the Hartford megachurch list and Outreach 100","Write the formal-review response packet","Line up two or three multi-campus references","Code large-church closed-lost reasons in the CRM"]}}
};
export const searchIndex = [
 ...Object.entries(paths).flatMap(([k,p])=>Object.entries(p.tabs).map(([t,v])=>({id:k,label:`${p.title} · ${t}`,text:JSON.stringify(v)}))),
 {id:"rivals",label:"Competitor explorer",text:"Planning Center Pushpay Subsplash Realm ACS Tithely Breeze pricing promise"},
 {id:"open",label:"Still open",text:"still open clarification unknown switching demo reviews price fees win loss owners"},
 {id:"values",label:"What churches value",text:"ease support price fair one place reports giving growth"},
 {id:"review",label:"Review scores",text:"council clarity flow score gate"}];
