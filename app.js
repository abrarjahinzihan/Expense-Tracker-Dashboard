/* ============================================================
   FINTRACK — app.js  (v2 — Zero initial state + Clear All)
   ============================================================ */
'use strict';

/* ════════════════════════════════════════════════════════════
   1. CONSTANTS
   ════════════════════════════════════════════════════════════ */
const STORAGE_KEY_TX     = 'fintrack_transactions_v2';
const STORAGE_KEY_THEME  = 'fintrack_theme';
const STORAGE_KEY_BUDGET = 'fintrack_budgets_v2';

const CATEGORIES = {
  'Food & Dining':  { emoji: '🍔', color: '#f97316', bg: 'rgba(249,115,22,.15)' },
  'Transport':      { emoji: '🚗', color: '#3b82f6', bg: 'rgba(59,130,246,.15)' },
  'Shopping':       { emoji: '🛍️', color: '#a855f7', bg: 'rgba(168,85,247,.15)' },
  'Entertainment':  { emoji: '🎬', color: '#ec4899', bg: 'rgba(236,72,153,.15)' },
  'Health':         { emoji: '💊', color: '#10b981', bg: 'rgba(16,185,129,.15)' },
  'Utilities':      { emoji: '💡', color: '#eab308', bg: 'rgba(234,179,8,.15)'  },
  'Rent / Housing': { emoji: '🏠', color: '#6366f1', bg: 'rgba(99,102,241,.15)' },
  'Education':      { emoji: '📚', color: '#14b8a6', bg: 'rgba(20,184,166,.15)' },
  'Travel':         { emoji: '✈️', color: '#f43f5e', bg: 'rgba(244,63,94,.15)'  },
  'Salary':         { emoji: '💼', color: '#10b981', bg: 'rgba(16,185,129,.15)' },
  'Freelance':      { emoji: '💻', color: '#6366f1', bg: 'rgba(99,102,241,.15)' },
  'Investment':     { emoji: '📈', color: '#f59e0b', bg: 'rgba(245,158,11,.15)' },
  'Gift':           { emoji: '🎁', color: '#ec4899', bg: 'rgba(236,72,153,.15)' },
  'Other':          { emoji: '💰', color: '#8b90a0', bg: 'rgba(139,144,160,.15)'}
};

const EXPENSE_CATS = ['Food & Dining','Transport','Shopping','Entertainment',
                      'Health','Utilities','Rent / Housing','Education','Travel','Other'];
const INCOME_CATS  = ['Salary','Freelance','Investment','Gift','Other'];

/* ════════════════════════════════════════════════════════════
   2. STATE
   ════════════════════════════════════════════════════════════ */
let transactions   = [];   // starts empty — no seed data
let budgets        = [];
let selectedType   = 'expense';
let selectedCat    = '';
let deleteTargetId = null;
let barChartPeriod = 'monthly';
let barChart, doughnutChart, lineChart, incomePieChart;

/* ════════════════════════════════════════════════════════════
   3. HELPERS
   ════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

function fmt(n) {
  return '$' + Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* ════════════════════════════════════════════════════════════
   4. LOCAL STORAGE
   ════════════════════════════════════════════════════════════ */
function loadData() {
  try {
    transactions = JSON.parse(localStorage.getItem(STORAGE_KEY_TX))     || [];
    budgets      = JSON.parse(localStorage.getItem(STORAGE_KEY_BUDGET)) || [];
  } catch {
    transactions = [];
    budgets      = [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
}

function saveBudgets() {
  localStorage.setItem(STORAGE_KEY_BUDGET, JSON.stringify(budgets));
}

/* ════════════════════════════════════════════════════════════
   5. CALCULATIONS
   ════════════════════════════════════════════════════════════ */
function calcTotals() {
  const income  = transactions.filter(t => t.type === 'income' ).reduce((s,t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.max(0, ((income - expense) / income) * 100) : 0;
  return { income, expense, balance, savingsRate };
}

/* ════════════════════════════════════════════════════════════
   6. RENDER CARDS
   ════════════════════════════════════════════════════════════ */
function renderCards() {
  const { income, expense, balance, savingsRate } = calcTotals();

  // Balance
  const balEl = $('totalBalance');
  balEl.textContent = fmt(balance);
  balEl.className = 'card-amount' + (balance < 0 ? ' expense-text' : '');

  $('totalIncome').textContent  = fmt(income);
  $('totalExpense').textContent = fmt(expense);
  $('savingsRate').textContent  = savingsRate.toFixed(1) + '%';

  const incTx = transactions.filter(t => t.type === 'income');
  const expTx = transactions.filter(t => t.type === 'expense');
  $('incomeCount').textContent  = incTx.length + ' transaction' + (incTx.length  !== 1 ? 's' : '');
  $('expenseCount').textContent = expTx.length + ' transaction' + (expTx.length  !== 1 ? 's' : '');

  // Savings bar
  $('savingsBar').style.width = Math.min(savingsRate, 100) + '%';
  $('savingsLabel').textContent = income > 0
    ? (savingsRate >= 0 ? `Saving ${savingsRate.toFixed(0)}% of income` : 'Spending more than earning')
    : 'Start adding income';

  // Last transaction trend
  if (transactions.length > 0) {
    const last = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date))[0];
    const sign = last.type === 'income' ? '+' : '-';
    $('balanceTrend').textContent = `Last: ${sign}${fmt(last.amount)} · ${last.category}`;
  } else {
    $('balanceTrend').textContent = 'No transactions yet';
  }

  // Topbar count label
  const lbl = $('txCountLabel');
  if (lbl) lbl.textContent = transactions.length + ' transaction' + (transactions.length !== 1 ? 's' : '') + ' total';
}

/* ════════════════════════════════════════════════════════════
   7. TRANSACTION HTML
   ════════════════════════════════════════════════════════════ */
function txHTML(tx) {
  const cat  = CATEGORIES[tx.category] || CATEGORIES['Other'];
  const sign = tx.type === 'income' ? '+' : '-';
  const date = new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
  return `
    <div class="tx-item" data-id="${tx.id}">
      <div class="tx-icon" style="background:${cat.bg}">${cat.emoji}</div>
      <div class="tx-info">
        <div class="tx-name" title="${tx.description}">${tx.description}</div>
        <div class="tx-meta">
          <span class="tx-cat-badge">${tx.category}</span>
          <span>${date}</span>
          ${tx.note ? `<span>· ${tx.note}</span>` : ''}
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount ${tx.type}">${sign}${fmt(tx.amount)}</span>
        <button class="tx-delete" data-id="${tx.id}" title="Delete this transaction">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   8. RENDER LISTS
   ════════════════════════════════════════════════════════════ */
function renderRecentList() {
  const recent = [...transactions]
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const listEl  = $('recentList');
  const emptyEl = $('dashEmptyState');

  if (recent.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.add('show');
  } else {
    emptyEl.classList.remove('show');
    listEl.innerHTML = recent.map(txHTML).join('');
  }
}

function renderFullList() {
  const search = $('searchInput').value.trim().toLowerCase();
  const type   = $('filterType').value;
  const cat    = $('filterCategory').value;
  const sortBy = $('filterSort').value;

  // Toggle clear button for search
  const clearBtn = $('searchClearBtn');
  if (clearBtn) clearBtn.classList.toggle('visible', search.length > 0);

  let list = [...transactions];
  if (type !== 'all') list = list.filter(t => t.type === type);
  if (cat  !== 'all') list = list.filter(t => t.category === cat);
  if (search) list = list.filter(t =>
    t.description.toLowerCase().includes(search) ||
    t.category.toLowerCase().includes(search) ||
    (t.note && t.note.toLowerCase().includes(search))
  );

  if (sortBy === 'newest')  list.sort((a,b) => new Date(b.date) - new Date(a.date));
  if (sortBy === 'oldest')  list.sort((a,b) => new Date(a.date) - new Date(b.date));
  if (sortBy === 'highest') list.sort((a,b) => b.amount - a.amount);
  if (sortBy === 'lowest')  list.sort((a,b) => a.amount - b.amount);

  const listEl  = $('fullTransactionList');
  const emptyEl = $('txEmptyState');

  if (list.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.add('show');
  } else {
    emptyEl.classList.remove('show');
    listEl.innerHTML = list.map(txHTML).join('');
  }
}

function populateCategoryFilter() {
  const sel  = $('filterCategory');
  const cats = [...new Set(transactions.map(t => t.category))].sort();
  const cur  = sel.value;
  sel.innerHTML = '<option value="all">All Categories</option>' +
    cats.map(c => `<option value="${c}"${c === cur ? ' selected' : ''}>${c}</option>`).join('');
}

/* ════════════════════════════════════════════════════════════
   9. CHARTS — helpers
   ════════════════════════════════════════════════════════════ */
function chartTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return {
    text:    dark ? '#6b7280' : '#9da3b8',
    grid:    dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)',
    tipBg:   dark ? '#1a1e2a' : '#ffffff',
    tipText: dark ? '#eef0f8' : '#0d1117',
    tipBorder: dark ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.08)',
  };
}

const CHART_PALETTE = ['#6366f1','#10b981','#f43f5e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#a855f7','#eab308'];

/* ── Bar Chart ── */
function buildBarData() {
  const now = new Date();
  if (barChartPeriod === 'monthly') {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('en-US',{month:'short'}), y: d.getFullYear(), m: d.getMonth() });
    }
    return {
      labels:  months.map(m => m.label),
      income:  months.map(m => transactions.filter(t => t.type==='income'  && new Date(t.date).getFullYear()===m.y && new Date(t.date).getMonth()===m.m).reduce((s,t)=>s+t.amount,0)),
      expense: months.map(m => transactions.filter(t => t.type==='expense' && new Date(t.date).getFullYear()===m.y && new Date(t.date).getMonth()===m.m).reduce((s,t)=>s+t.amount,0)),
    };
  } else {
    const labels=[], income=[], expense=[];
    for (let i=6; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const ds = d.toISOString().split('T')[0];
      labels.push(d.toLocaleString('en-US',{weekday:'short'}));
      income.push( transactions.filter(t=>t.type==='income'  && t.date===ds).reduce((s,t)=>s+t.amount,0));
      expense.push(transactions.filter(t=>t.type==='expense' && t.date===ds).reduce((s,t)=>s+t.amount,0));
    }
    return { labels, income, expense };
  }
}

function renderBarChart() {
  const ctx = document.getElementById('barChart').getContext('2d');
  const { labels, income, expense } = buildBarData();
  const th = chartTheme();
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Income',   data: income,  backgroundColor:'rgba(16,185,129,.75)', borderRadius:8, borderSkipped:false },
        { label:'Expenses', data: expense, backgroundColor:'rgba(244,63,94,.75)', borderRadius:8, borderSkipped:false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: tipStyle(th, v => fmt(v))
      },
      scales: {
        x: scaleStyle(th),
        y: scaleStyle(th, v => '$'+v)
      }
    }
  });
}

/* ── Doughnut (expense by category) ── */
function renderDoughnutChart() {
  const ctx = document.getElementById('doughnutChart').getContext('2d');
  const th = chartTheme();
  if (doughnutChart) doughnutChart.destroy();

  const catMap = {};
  transactions.filter(t=>t.type==='expense').forEach(t => { catMap[t.category]=(catMap[t.category]||0)+t.amount; });
  const labels = Object.keys(catMap);
  const data   = Object.values(catMap);
  const colors = labels.map(l => CATEGORIES[l]?.color || '#8b90a0');
  const total  = data.reduce((a,b)=>a+b,0);

  doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.map(c=>c+'bb'), borderColor: colors, borderWidth:2, hoverOffset:8 }]
    },
    options: {
      responsive:true, maintainAspectRatio:false, cutout:'72%',
      plugins: {
        legend:{ display:false },
        tooltip: tipStyle(th, (v,ctx2) => ` ${fmt(v)} (${total>0?((v/total)*100).toFixed(1):0}%)`)
      }
    }
  });

  $('donutLegend').innerHTML = labels.length
    ? labels.map((l,i)=>`<div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div><span>${l}</span></div>`).join('')
    : `<span style="font-size:.76rem;color:var(--text-3)">No expense data yet</span>`;
}

/* ── Line chart (balance over time) ── */
function renderLineChart() {
  const ctx = document.getElementById('lineChart').getContext('2d');
  const th = chartTheme();
  if (lineChart) lineChart.destroy();

  const sorted = [...transactions].sort((a,b)=>new Date(a.date)-new Date(b.date));
  let run = 0;
  const pts = sorted.map(t => { run += t.type==='income'?t.amount:-t.amount; return run; });
  const lbls = sorted.map(t => new Date(t.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}));

  const useLabels = lbls.length ? lbls : ['Now'];
  const useData   = pts.length  ? pts  : [0];

  const grad = ctx.createLinearGradient(0,0,0,260);
  grad.addColorStop(0,'rgba(99,102,241,.35)');
  grad.addColorStop(1,'rgba(99,102,241,0)');

  lineChart = new Chart(ctx, {
    type:'line',
    data:{
      labels: useLabels,
      datasets:[{
        label:'Balance', data: useData,
        borderColor:'#6366f1', backgroundColor: grad, fill:true,
        tension:.4, pointBackgroundColor:'#6366f1', pointBorderColor:'#fff',
        pointBorderWidth:2, pointRadius:4, pointHoverRadius:6,
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip: tipStyle(th, v=>' Balance: '+fmt(v)) },
      scales:{
        x: scaleStyle(th, null, 8),
        y: scaleStyle(th, v=>'$'+v)
      }
    }
  });
}

/* ── Income pie ── */
function renderIncomePieChart() {
  const ctx = document.getElementById('incomePieChart').getContext('2d');
  const th = chartTheme();
  if (incomePieChart) incomePieChart.destroy();

  const catMap={};
  transactions.filter(t=>t.type==='income').forEach(t=>{ catMap[t.category]=(catMap[t.category]||0)+t.amount; });
  const labels=Object.keys(catMap), data=Object.values(catMap);
  const colors=labels.map(l=>CATEGORIES[l]?.color||'#8b90a0');

  incomePieChart = new Chart(ctx, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:colors.map(c=>c+'bb'), borderColor:colors, borderWidth:2, hoverOffset:8 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{ legend:{display:false}, tooltip: tipStyle(th, v=>` ${fmt(v)}`) } }
  });

  $('incomeLegend').innerHTML = labels.length
    ? labels.map((l,i)=>`<div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div><span>${l}</span></div>`).join('')
    : `<span style="font-size:.76rem;color:var(--text-3)">No income data yet</span>`;
}

/* shared Chart.js style helpers */
function tipStyle(th, fmtFn) {
  return {
    backgroundColor: th.tipBg,
    titleColor: th.tipText,
    bodyColor: th.text,
    borderColor: th.tipBorder,
    borderWidth: 1,
    padding: 12,
    callbacks: { label: ctx => fmtFn(ctx.parsed.y ?? ctx.parsed, ctx) }
  };
}
function scaleStyle(th, tickFmt=null, maxTicks=undefined) {
  return {
    grid: { color: th.grid },
    ticks: {
      color: th.text,
      font: { size: 11 },
      ...(maxTicks ? { maxTicksLimit: maxTicks } : {}),
      ...(tickFmt ? { callback: tickFmt } : {})
    }
  };
}

function renderAllCharts() {
  renderBarChart();
  renderDoughnutChart();
  renderLineChart();
  renderIncomePieChart();
}

/* ════════════════════════════════════════════════════════════
   10. ANALYTICS STATS
   ════════════════════════════════════════════════════════════ */
function renderAnalyticsStats() {
  const inc = transactions.filter(t=>t.type==='income');
  const exp = transactions.filter(t=>t.type==='expense');

  $('avgIncome').textContent     = inc.length ? fmt(inc.reduce((s,t)=>s+t.amount,0)/inc.length) : '$0.00';
  $('avgExpense').textContent    = exp.length ? fmt(exp.reduce((s,t)=>s+t.amount,0)/exp.length) : '$0.00';
  $('largestExpense').textContent= exp.length ? fmt(Math.max(...exp.map(t=>t.amount)))          : '$0.00';
  $('largestIncome').textContent = inc.length ? fmt(Math.max(...inc.map(t=>t.amount)))          : '$0.00';
  $('totalTx').textContent       = transactions.length;

  const catMap={};
  exp.forEach(t=>{ catMap[t.category]=(catMap[t.category]||0)+t.amount; });
  const top = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
  $('topCategory').textContent   = top ? `${CATEGORIES[top[0]]?.emoji||''} ${top[0]}` : '—';
}

/* ════════════════════════════════════════════════════════════
   11. BUDGETS
   ════════════════════════════════════════════════════════════ */
function currentMonthExpenses(category) {
  const now = new Date();
  return transactions
    .filter(t => t.type==='expense' && t.category===category)
    .filter(t => { const d=new Date(t.date+'T00:00:00'); return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth(); })
    .reduce((s,t)=>s+t.amount,0);
}

function renderBudgets() {
  const grid = $('budgetGrid');
  const em   = $('budgetEmptyState');
  if (budgets.length === 0) { grid.innerHTML=''; em.classList.add('show'); return; }
  em.classList.remove('show');

  grid.innerHTML = budgets.map(b => {
    const spent  = currentMonthExpenses(b.category);
    const pct    = b.limit>0 ? Math.min((spent/b.limit)*100,100) : 0;
    const cat    = CATEGORIES[b.category]||CATEGORIES['Other'];
    const isOver = spent>b.limit;
    const isWarn = !isOver && pct>=80;
    const clr    = isOver?'#f43f5e':isWarn?'#f59e0b':'#10b981';
    const statusText = isOver
      ? `⚠️ Over by ${fmt(spent-b.limit)}`
      : isWarn
      ? `Almost there — ${fmt(b.limit-spent)} left`
      : `✓ ${fmt(b.limit-spent)} remaining`;
    const statusClass = isOver?'over':isWarn?'warn':'ok';

    return `
      <div class="budget-card">
        <div class="budget-card-header">
          <div class="budget-cat-info">
            <div class="budget-cat-icon" style="background:${cat.bg}">${cat.emoji}</div>
            <div>
              <div class="budget-cat-name">${b.category}</div>
              <div class="budget-cat-month">This month</div>
            </div>
          </div>
          <button class="budget-delete-btn" data-budget-id="${b.id}" title="Remove goal">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="budget-amounts">
          <span class="budget-spent" style="color:${clr}">${fmt(spent)} spent</span>
          <span class="budget-limit">of ${fmt(b.limit)}</span>
        </div>
        <div class="budget-progress-wrap">
          <div class="budget-progress" style="width:${pct}%;background:linear-gradient(90deg,${clr},${clr}99)"></div>
        </div>
        <div class="budget-status ${statusClass}">${statusText}</div>
      </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════════
   12. CATEGORY PICKER
   ════════════════════════════════════════════════════════════ */
function buildCategoryPicker(type) {
  const cats = type==='income' ? INCOME_CATS : EXPENSE_CATS;
  const picker = $('categoryPicker');
  picker.innerHTML = cats.map(c => {
    const cat = CATEGORIES[c];
    return `<button type="button" class="cat-option${selectedCat===c?' selected':''}" data-cat="${c}">
      <span>${cat.emoji}</span><span>${c}</span>
    </button>`;
  }).join('');
  picker.querySelectorAll('.cat-option').forEach(btn => {
    btn.addEventListener('click', () => {
      picker.querySelectorAll('.cat-option').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCat = btn.dataset.cat;
    });
  });
}

/* ════════════════════════════════════════════════════════════
   13. MODALS — TRANSACTION
   ════════════════════════════════════════════════════════════ */
function openModal() {
  $('modalOverlay').classList.add('open');
  $('txDate').value = new Date().toISOString().split('T')[0];
  $('transactionForm').reset();
  selectedType = 'expense';
  selectedCat  = '';
  $('typeExpense').classList.add('active');
  $('typeIncome').classList.remove('active');
  $('modalIconBadge').style.background = 'rgba(244,63,94,.14)';
  $('modalIconBadge').style.color      = '#f43f5e';
  buildCategoryPicker('expense');
  setTimeout(() => $('txDescription').focus(), 120);
}

function closeModal() { $('modalOverlay').classList.remove('open'); }

/* ════════════════════════════════════════════════════════════
   14. MODALS — BUDGET
   ════════════════════════════════════════════════════════════ */
function openBudgetModal() {
  const existing = budgets.map(b=>b.category);
  const available = Object.keys(CATEGORIES).filter(c=>!existing.includes(c));
  if (available.length===0) { showToast('All categories have budget goals!','info','ℹ️'); return; }
  const sel = $('budgetCategory');
  sel.innerHTML = available.map(c=>`<option value="${c}">${CATEGORIES[c].emoji} ${c}</option>`).join('');
  $('budgetModalOverlay').classList.add('open');
  $('budgetLimit').value = '';
  setTimeout(() => $('budgetLimit').focus(), 120);
}
function closeBudgetModal() { $('budgetModalOverlay').classList.remove('open'); }

/* ════════════════════════════════════════════════════════════
   15. CLEAR ALL — MODAL
   ════════════════════════════════════════════════════════════ */
function openClearAllModal() {
  if (transactions.length===0) { showToast('No transactions to clear.','info','ℹ️'); return; }
  const cc = $('clearAllCount');
  if (cc) cc.textContent = transactions.length + (transactions.length===1?' transaction':' transactions');
  $('clearAllOverlay').classList.add('open');
}
function closeClearAllModal() { $('clearAllOverlay').classList.remove('open'); }

function clearAllTransactions() {
  const count = transactions.length;
  transactions = [];
  saveTransactions();
  closeClearAllModal();
  renderAll();
  showToast(`🗑️ Cleared ${count} transaction${count!==1?'s':''}`, 'error', '');
}

/* ════════════════════════════════════════════════════════════
   16. DELETE SINGLE
   ════════════════════════════════════════════════════════════ */
function openDeleteModal(id) { deleteTargetId=id; $('deleteOverlay').classList.add('open'); }
function closeDeleteModal()  { deleteTargetId=null; $('deleteOverlay').classList.remove('open'); }

function deleteTransaction(id) {
  transactions = transactions.filter(t=>t.id!==id);
  saveTransactions();
  renderAll();
  showToast('Transaction deleted','error','🗑️');
}

function deleteBudget(id) {
  budgets = budgets.filter(b=>b.id!==id);
  saveBudgets();
  renderBudgets();
  showToast('Budget goal removed','info','🎯');
}

/* ════════════════════════════════════════════════════════════
   17. TOAST
   ════════════════════════════════════════════════════════════ */
let toastTimer;
function showToast(msg, type='success', icon='') {
  const t   = $('toast');
  const ico = $('toastIcon');
  const msg_ = $('toastMsg');
  if (ico) ico.textContent  = icon;
  if (msg_) msg_.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

/* ════════════════════════════════════════════════════════════
   18. RENDER ALL
   ════════════════════════════════════════════════════════════ */
function renderAll() {
  renderCards();
  renderRecentList();
  renderFullList();
  populateCategoryFilter();
  renderAllCharts();
  renderAnalyticsStats();
  renderBudgets();
}

/* ════════════════════════════════════════════════════════════
   19. NAVIGATION
   ════════════════════════════════════════════════════════════ */
const SECTION_TITLES = {
  dashboard:    'Dashboard',
  transactions: 'Transactions',
  analytics:    'Analytics',
  budget:       'Budget Goals'
};

function switchSection(name) {
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));

  const sec = $('section-'+name);
  if (sec) sec.classList.add('active');
  document.querySelector(`.nav-item[data-section="${name}"]`)?.classList.add('active');
  $('pageTitle').textContent = SECTION_TITLES[name]||'Dashboard';

  // Redraw charts when switching to analytics
  if (name==='analytics') { renderLineChart(); renderIncomePieChart(); renderAnalyticsStats(); }
  if (name==='dashboard')  { renderBarChart(); renderDoughnutChart(); }

  // Close sidebar on mobile
  if (window.innerWidth < 720) {
    $('sidebar').classList.remove('open');
    $('sidebarOverlay')?.classList.remove('show');
  }
}

/* ════════════════════════════════════════════════════════════
   20. THEME
   ════════════════════════════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('themeLabel').textContent = theme==='dark'?'Light Mode':'Dark Mode';
  localStorage.setItem(STORAGE_KEY_THEME, theme);
  renderAllCharts();
}

/* ════════════════════════════════════════════════════════════
   21. GREETING
   ════════════════════════════════════════════════════════════ */
function setGreeting() {
  const h = new Date().getHours();
  const g = h<12?'Good morning! 👋':h<17?'Good afternoon! ☀️':'Good evening! 🌙';
  $('welcomeGreet').textContent = g;
  $('pageDate').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

/* ════════════════════════════════════════════════════════════
   22. SIDEBAR OVERLAY (mobile)
   ════════════════════════════════════════════════════════════ */
function injectSidebarOverlay() {
  if ($('sidebarOverlay')) return;
  const el = document.createElement('div');
  el.className = 'sidebar-overlay';
  el.id = 'sidebarOverlay';
  document.body.appendChild(el);
  el.addEventListener('click', () => {
    $('sidebar').classList.remove('open');
    el.classList.remove('show');
  });
}

/* ════════════════════════════════════════════════════════════
   23. EVENT LISTENERS
   ════════════════════════════════════════════════════════════ */
function initEvents() {

  /* Navigation */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); switchSection(item.dataset.section); });
  });
  document.querySelectorAll('.see-all-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  /* Sidebar toggle */
  $('sidebarToggle').addEventListener('click', () => {
    if (window.innerWidth < 720) {
      const open = $('sidebar').classList.toggle('open');
      $('sidebarOverlay')?.classList.toggle('show', open);
    } else {
      const collapsed = $('sidebar').classList.toggle('collapsed');
      $('mainContent').classList.toggle('expanded', collapsed);
    }
  });

  /* Theme */
  $('themeToggle').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  });

  /* Open/close transaction modal */
  $('openModalBtn').addEventListener('click', openModal);
  $('closeModalBtn').addEventListener('click', closeModal);
  $('cancelBtn').addEventListener('click', closeModal);
  $('modalOverlay').addEventListener('click', e=>{ if(e.target===$('modalOverlay')) closeModal(); });

  /* Empty state CTA */
  $('emptyAddBtn')?.addEventListener('click', openModal);

  /* Empty budget state CTA */
  $('emptyBudgetBtn')?.addEventListener('click', openBudgetModal);

  /* Type toggle */
  $('typeExpense').addEventListener('click', () => {
    selectedType='expense'; selectedCat='';
    $('typeExpense').classList.add('active');
    $('typeIncome').classList.remove('active');
    $('modalIconBadge').style.background='rgba(244,63,94,.14)';
    $('modalIconBadge').style.color='#f43f5e';
    buildCategoryPicker('expense');
  });
  $('typeIncome').addEventListener('click', () => {
    selectedType='income'; selectedCat='';
    $('typeIncome').classList.add('active');
    $('typeExpense').classList.remove('active');
    $('modalIconBadge').style.background='rgba(16,185,129,.14)';
    $('modalIconBadge').style.color='#10b981';
    buildCategoryPicker('income');
  });

  /* Transaction form */
  $('transactionForm').addEventListener('submit', e => {
    e.preventDefault();
    const desc   = $('txDescription').value.trim();
    const amount = parseFloat($('txAmount').value);
    const date   = $('txDate').value;
    const note   = $('txNote').value.trim();

    if (!desc)             { showToast('Please enter a description','error','⚠️'); return; }
    if (!amount||amount<=0){ showToast('Please enter a valid amount','error','⚠️'); return; }
    if (!date)             { showToast('Please select a date','error','⚠️'); return; }
    if (!selectedCat)      { showToast('Please pick a category','error','⚠️'); return; }

    const tx = { id:genId(), type:selectedType, description:desc, amount, date, category:selectedCat, note, createdAt:new Date().toISOString() };
    transactions.unshift(tx);
    saveTransactions();
    closeModal();
    renderAll();
    const icon = selectedType==='income'?'💚':'🔴';
    showToast(`${icon} ${selectedType==='income'?'Income':'Expense'} added successfully!`, 'success', icon);

    // Pulse the matching card
    const card = selectedType==='income'
      ? document.querySelector('.card-income')
      : document.querySelector('.card-expense');
    card?.classList.add('pulse');
    setTimeout(()=>card?.classList.remove('pulse'),800);
  });

  /* Delegated delete / budget delete */
  document.addEventListener('click', e => {
    const del = e.target.closest('.tx-delete');
    if (del) { openDeleteModal(del.dataset.id); return; }
    const bDel = e.target.closest('.budget-delete-btn');
    if (bDel) { deleteBudget(bDel.dataset.budgetId); }
  });

  /* Delete confirm */
  $('confirmDeleteBtn').addEventListener('click', () => {
    if (deleteTargetId) deleteTransaction(deleteTargetId);
    closeDeleteModal();
  });
  $('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  $('deleteOverlay').addEventListener('click', e=>{ if(e.target===$('deleteOverlay')) closeDeleteModal(); });

  /* Clear All — topbar button */
  $('clearAllBtn').addEventListener('click', openClearAllModal);

  /* Clear All — transactions page button */
  $('clearAllTxBtn')?.addEventListener('click', openClearAllModal);

  /* Clear All confirm */
  $('confirmClearBtn').addEventListener('click', clearAllTransactions);
  $('cancelClearBtn').addEventListener('click', closeClearAllModal);
  $('clearAllOverlay').addEventListener('click', e=>{ if(e.target===$('clearAllOverlay')) closeClearAllModal(); });

  /* Search */
  $('searchInput').addEventListener('input', renderFullList);
  $('searchClearBtn')?.addEventListener('click', () => {
    $('searchInput').value = '';
    renderFullList();
    $('searchClearBtn').classList.remove('visible');
  });

  /* Filters */
  $('filterType').addEventListener('change', renderFullList);
  $('filterCategory').addEventListener('change', renderFullList);
  $('filterSort').addEventListener('change', renderFullList);

  /* Chart tabs */
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      barChartPeriod = tab.dataset.period;
      renderBarChart();
    });
  });

  /* Budget modal */
  $('openBudgetModalBtn').addEventListener('click', openBudgetModal);
  $('closeBudgetModalBtn').addEventListener('click', closeBudgetModal);
  $('cancelBudgetBtn').addEventListener('click', closeBudgetModal);
  $('budgetModalOverlay').addEventListener('click', e=>{ if(e.target===$('budgetModalOverlay')) closeBudgetModal(); });

  $('budgetForm').addEventListener('submit', e => {
    e.preventDefault();
    const category = $('budgetCategory').value;
    const limit    = parseFloat($('budgetLimit').value);
    if (!limit||limit<=0) { showToast('Enter a valid limit','error','⚠️'); return; }
    budgets.push({ id:genId(), category, limit });
    saveBudgets();
    closeBudgetModal();
    renderBudgets();
    showToast(`🎯 Budget goal set for ${category}!`, 'success', '🎯');
  });

  /* Keyboard */
  document.addEventListener('keydown', e => {
    if (e.key==='Escape') {
      closeModal();
      closeBudgetModal();
      closeDeleteModal();
      closeClearAllModal();
    }
  });
}

/* ════════════════════════════════════════════════════════════
   24. INIT
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* Theme */
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  document.documentElement.dataset.theme = savedTheme;
  $('themeLabel').textContent = savedTheme==='dark'?'Light Mode':'Dark Mode';

  /* Sidebar overlay for mobile */
  injectSidebarOverlay();

  /* Greeting & date */
  setGreeting();

  /* Load data — starts empty on first visit */
  loadData();

  /* Wire up all events */
  initEvents();

  /* Render everything */
  renderAll();
});
