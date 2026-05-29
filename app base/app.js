let INGREDIENTS = null;
let recipes = [];
let currentRecipeId = null;
let formIngredients = [];

const viewList = document.getElementById('view-list');
const viewForm = document.getElementById('view-form');
const viewDetail = document.getElementById('view-detail');
const recipesGrid = document.getElementById('recipes-grid');
const loadingMsg = document.getElementById('loading-msg');
const errorMsg = document.getElementById('error-msg');

function formatNumber(n) {
  return Number(n.toFixed(2)).toString();
}

function convert(amount, ingredient, fromUnit, toUnit) {
  if (fromUnit === toUnit) return amount;
  const table = INGREDIENTS[ingredient];
  return amount * table[fromUnit] / table[toUnit];
}

function scale(amount, originalPortions, newPortions) {
  return amount * newPortions / originalPortions;
}

function showView(name) {
  viewList.classList.add('hidden');
  viewForm.classList.add('hidden');
  viewDetail.classList.add('hidden');
  document.getElementById('view-' + name).classList.remove('hidden');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function loadPreloadedRecipes() {
  try {
    const res = await fetch('./recetas.json');
    if (!res.ok) return;
    const preloaded = await res.json();
    if (!Array.isArray(preloaded)) return;
    recipes = preloaded.map(r => ({ ...r, id: r.id || uid() }));
  } catch (err) {
    console.warn('No se pudo cargar recetas.json:', err.message);
  }
}

async function boot() {
  try {
    const res = await fetch('./unidades.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    INGREDIENTS = await res.json();
    await loadPreloadedRecipes();
    loadingMsg.classList.add('hidden');
    renderList();
    bindEvents();
  } catch (err) {
    loadingMsg.classList.add('hidden');
    errorMsg.textContent =
      'No se pudo cargar unidades.json. Corré la app desde un servidor local ' +
      '(ej: "python -m http.server" en la carpeta y abrí http://localhost:8000). ' +
      'Detalle: ' + err.message;
    errorMsg.classList.remove('hidden');
  }
}

function renderList() {
  if (recipes.length === 0) {
    recipesGrid.innerHTML =
      '<div class="empty-state">Todavía no agregaste ninguna receta.<br>Aprieta <strong>+ Agregar receta</strong> para empezar.</div>';
    return;
  }
  recipesGrid.innerHTML = recipes.map(r => `
    <div class="recipe-card" data-id="${r.id}">
      <h3>${escapeHtml(r.name)}</h3>
      <p>${r.portions} porciones · ${r.ingredients.length} ingrediente${r.ingredients.length !== 1 ? 's' : ''}</p>
    </div>
  `).join('');
  recipesGrid.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', () => openRecipe(card.dataset.id));
  });
}

function openForm() {
  formIngredients = [{ ingredient: '', amount: '', unit: '' }];
  document.getElementById('form-name').value = '';
  document.getElementById('form-portions').value = 8;
  document.getElementById('form-error').classList.add('hidden');
  renderFormIngredients();
  showView('form');
}

function renderFormIngredients() {
  const container = document.getElementById('form-ingredients');
  const ingredientNames = Object.keys(INGREDIENTS);

  container.innerHTML = formIngredients.map((row, idx) => {
    const units = row.ingredient ? Object.keys(INGREDIENTS[row.ingredient]) : [];
    const ingOptions = ingredientNames.map(n =>
      `<option value="${escapeHtml(n)}" ${n === row.ingredient ? 'selected' : ''}>${escapeHtml(n)}</option>`
    ).join('');
    const unitOptions = units.map(u =>
      `<option value="${escapeHtml(u)}" ${u === row.unit ? 'selected' : ''}>${escapeHtml(u)}</option>`
    ).join('');
    const amountValue = row.amount === '' ? '' : escapeHtml(row.amount);
    const removeDisabled = formIngredients.length === 1 ? 'disabled' : '';
    return `
      <div class="ingredient-row" data-idx="${idx}">
        <select class="row-ingredient">
          <option value="">Ingrediente...</option>
          ${ingOptions}
        </select>
        <input type="number" class="row-amount" placeholder="Cant." min="0" step="any" value="${amountValue}">
        <select class="row-unit" ${!row.ingredient ? 'disabled' : ''}>
          <option value="">Unidad...</option>
          ${unitOptions}
        </select>
        <button type="button" class="btn-icon row-remove" title="Eliminar" ${removeDisabled}>✕</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.ingredient-row').forEach(rowEl => {
    const idx = Number(rowEl.dataset.idx);
    rowEl.querySelector('.row-ingredient').addEventListener('change', e => {
      formIngredients[idx].ingredient = e.target.value;
      formIngredients[idx].unit = '';
      renderFormIngredients();
    });
    rowEl.querySelector('.row-amount').addEventListener('input', e => {
      formIngredients[idx].amount = e.target.value;
    });
    rowEl.querySelector('.row-unit').addEventListener('change', e => {
      formIngredients[idx].unit = e.target.value;
    });
    rowEl.querySelector('.row-remove').addEventListener('click', () => {
      if (formIngredients.length > 1) {
        formIngredients.splice(idx, 1);
        renderFormIngredients();
      }
    });
  });
}

function addFormIngredient() {
  formIngredients.push({ ingredient: '', amount: '', unit: '' });
  renderFormIngredients();
}

function showFormError(msg) {
  const el = document.getElementById('form-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function saveRecipe() {
  const name = document.getElementById('form-name').value.trim();
  const portions = parseInt(document.getElementById('form-portions').value, 10);

  if (!name) { showFormError('Tenés que ponerle un nombre a la receta.'); return; }
  if (!portions || portions < 1) { showFormError('Las porciones deben ser un número mayor o igual a 1.'); return; }

  const validIngredients = [];
  for (let i = 0; i < formIngredients.length; i++) {
    const r = formIngredients[i];
    const amt = parseFloat(r.amount);
    if (!r.ingredient) { showFormError(`Ingrediente ${i + 1}: elegí un ingrediente.`); return; }
    if (!r.unit) { showFormError(`Ingrediente ${i + 1}: elegí una unidad.`); return; }
    if (isNaN(amt) || amt <= 0) { showFormError(`Ingrediente ${i + 1}: la cantidad debe ser mayor a 0.`); return; }
    validIngredients.push({ ingredient: r.ingredient, amount: amt, unit: r.unit });
  }

  recipes.push({
    id: uid(),
    name,
    portions,
    ingredients: validIngredients
  });
  document.getElementById('form-error').classList.add('hidden');
  renderList();
  showView('list');
}

function openRecipe(id) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;
  currentRecipeId = id;
  recipe.ingredients.forEach(ing => {
    if (!ing.displayUnit) ing.displayUnit = ing.unit;
  });
  document.getElementById('detail-name').textContent = recipe.name;
  const slider = document.getElementById('detail-slider');
  slider.value = recipe.portions;
  document.getElementById('detail-portions').textContent = recipe.portions;
  renderDetail();
  showView('detail');
}

function renderDetail() {
  const recipe = recipes.find(r => r.id === currentRecipeId);
  if (!recipe) return;
  const currentPortions = parseInt(document.getElementById('detail-slider').value, 10);
  const tbody = document.querySelector('#detail-table tbody');
  tbody.innerHTML = recipe.ingredients.map((ing, idx) => {
    const inDisplayUnit = convert(ing.amount, ing.ingredient, ing.unit, ing.displayUnit);
    const scaled = scale(inDisplayUnit, recipe.portions, currentPortions);
    const units = Object.keys(INGREDIENTS[ing.ingredient]);
    const unitOptions = units.map(u =>
      `<option value="${escapeHtml(u)}" ${u === ing.displayUnit ? 'selected' : ''}>${escapeHtml(u)}</option>`
    ).join('');
    return `
      <tr data-idx="${idx}">
        <td>${escapeHtml(ing.ingredient)}</td>
        <td class="qty">${formatNumber(scaled)}</td>
        <td><select class="unit-select">${unitOptions}</select></td>
      </tr>
    `;
  }).join('');
  tbody.querySelectorAll('tr').forEach(tr => {
    const idx = Number(tr.dataset.idx);
    tr.querySelector('.unit-select').addEventListener('change', e => {
      recipe.ingredients[idx].displayUnit = e.target.value;
      renderDetail();
    });
  });
}

function deleteCurrentRecipe() {
  if (!currentRecipeId) return;
  if (!confirm('¿Eliminar esta receta?')) return;
  recipes = recipes.filter(r => r.id !== currentRecipeId);
  currentRecipeId = null;
  renderList();
  showView('list');
}

function bindEvents() {
  document.getElementById('btn-add').addEventListener('click', openForm);
  document.getElementById('btn-cancel').addEventListener('click', () => showView('list'));
  document.getElementById('btn-save').addEventListener('click', saveRecipe);
  document.getElementById('btn-add-ingredient').addEventListener('click', addFormIngredient);
  document.getElementById('btn-back').addEventListener('click', () => showView('list'));
  document.getElementById('btn-delete').addEventListener('click', deleteCurrentRecipe);
  document.getElementById('detail-slider').addEventListener('input', e => {
    document.getElementById('detail-portions').textContent = e.target.value;
    renderDetail();
  });
}

boot();
