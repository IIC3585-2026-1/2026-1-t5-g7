<script setup>
import { ref, computed, reactive } from 'vue';
import INGREDIENTS from './unidades.json';
import preloaded from './recetas.json';

// --- Helpers (idénticos a la app base) ---
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

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const ingredientNames = Object.keys(INGREDIENTS);

// --- Estado reactivo ---
const view = ref('list'); // 'list' | 'form' | 'detail'
const recipes = ref(preloaded.map(r => ({ ...r, id: r.id || uid() })));
const currentRecipeId = ref(null);

// Formulario de nueva receta
const form = reactive({
  name: '',
  portions: 8,
  ingredients: [{ ingredient: '', amount: '', unit: '' }],
  error: ''
});

// Vista de detalle
const detailPortions = ref(0);

const currentRecipe = computed(() =>
  recipes.value.find(r => r.id === currentRecipeId.value) || null
);

// Filas de la tabla de detalle, ya escaladas y convertidas
const detailRows = computed(() => {
  const recipe = currentRecipe.value;
  if (!recipe) return [];
  return recipe.ingredients.map((ing, idx) => {
    const inDisplayUnit = convert(ing.amount, ing.ingredient, ing.unit, ing.displayUnit);
    const scaled = scale(inDisplayUnit, recipe.portions, detailPortions.value);
    return {
      idx,
      name: ing.ingredient,
      qty: formatNumber(scaled),
      units: Object.keys(INGREDIENTS[ing.ingredient]),
      displayUnit: ing.displayUnit
    };
  });
});

// --- Acciones ---
function openForm() {
  form.name = '';
  form.portions = 8;
  form.ingredients = [{ ingredient: '', amount: '', unit: '' }];
  form.error = '';
  view.value = 'form';
}

function addFormIngredient() {
  form.ingredients.push({ ingredient: '', amount: '', unit: '' });
}

function removeFormIngredient(idx) {
  if (form.ingredients.length > 1) form.ingredients.splice(idx, 1);
}

// Al cambiar el ingrediente, reseteamos la unidad elegida
function onIngredientChange(row) {
  row.unit = '';
}

function unitsFor(ingredient) {
  return ingredient ? Object.keys(INGREDIENTS[ingredient]) : [];
}

function saveRecipe() {
  const name = form.name.trim();
  const portions = parseInt(form.portions, 10);

  if (!name) { form.error = 'Tenés que ponerle un nombre a la receta.'; return; }
  if (!portions || portions < 1) { form.error = 'Las porciones deben ser un número mayor o igual a 1.'; return; }

  const validIngredients = [];
  for (let i = 0; i < form.ingredients.length; i++) {
    const r = form.ingredients[i];
    const amt = parseFloat(r.amount);
    if (!r.ingredient) { form.error = `Ingrediente ${i + 1}: elegí un ingrediente.`; return; }
    if (!r.unit) { form.error = `Ingrediente ${i + 1}: elegí una unidad.`; return; }
    if (isNaN(amt) || amt <= 0) { form.error = `Ingrediente ${i + 1}: la cantidad debe ser mayor a 0.`; return; }
    validIngredients.push({ ingredient: r.ingredient, amount: amt, unit: r.unit });
  }

  recipes.value.push({ id: uid(), name, portions, ingredients: validIngredients });
  form.error = '';
  view.value = 'list';
}

function openRecipe(id) {
  const recipe = recipes.value.find(r => r.id === id);
  if (!recipe) return;
  // Cada ingrediente recuerda en qué unidad se está mostrando
  recipe.ingredients.forEach(ing => {
    if (!ing.displayUnit) ing.displayUnit = ing.unit;
  });
  currentRecipeId.value = id;
  detailPortions.value = recipe.portions;
  view.value = 'detail';
}

function deleteCurrentRecipe() {
  if (!currentRecipeId.value) return;
  if (!confirm('¿Eliminar esta receta?')) return;
  recipes.value = recipes.value.filter(r => r.id !== currentRecipeId.value);
  currentRecipeId.value = null;
  view.value = 'list';
}
</script>

<template>
  <header>
    <h1>
      <img class="logo" src="/logo.webp" alt="">
      CakeUnits
    </h1>
  </header>

  <main>
    <!-- Vista: lista de recetas -->
    <section v-if="view === 'list'">
      <div class="view-header">
        <h2>Mis recetas</h2>
        <button class="btn btn-primary" @click="openForm">+ Agregar receta</button>
      </div>

      <div v-if="recipes.length === 0" class="empty-state">
        Todavía no agregaste ninguna receta.<br>
        Aprieta <strong>+ Agregar receta</strong> para empezar.
      </div>

      <div v-else class="recipes-grid">
        <div
          v-for="r in recipes"
          :key="r.id"
          class="recipe-card"
          @click="openRecipe(r.id)"
        >
          <h3>{{ r.name }}</h3>
          <p>
            {{ r.portions }} porciones ·
            {{ r.ingredients.length }} ingrediente{{ r.ingredients.length !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>
    </section>

    <!-- Vista: formulario de nueva receta -->
    <section v-else-if="view === 'form'">
      <h2>Nueva receta</h2>

      <label class="field">
        Nombre
        <input type="text" v-model="form.name" placeholder="Ej: Torta de chocolate">
      </label>

      <label class="field">
        Porciones que rinde
        <input type="number" v-model="form.portions" min="1" max="50">
      </label>

      <h3>Ingredientes</h3>
      <button class="btn btn-secondary" @click="addFormIngredient">+ Agregar ingrediente</button>

      <div id="form-ingredients">
        <div
          v-for="(row, idx) in form.ingredients"
          :key="idx"
          class="ingredient-row"
        >
          <select v-model="row.ingredient" @change="onIngredientChange(row)">
            <option value="">Ingrediente...</option>
            <option v-for="n in ingredientNames" :key="n" :value="n">{{ n }}</option>
          </select>

          <input type="number" v-model="row.amount" placeholder="Cant." min="0" step="any">

          <select v-model="row.unit" :disabled="!row.ingredient">
            <option value="">Unidad...</option>
            <option v-for="u in unitsFor(row.ingredient)" :key="u" :value="u">{{ u }}</option>
          </select>

          <button
            type="button"
            class="btn-icon"
            title="Eliminar"
            :disabled="form.ingredients.length === 1"
            @click="removeFormIngredient(idx)"
          >✕</button>
        </div>
      </div>

      <p v-if="form.error" class="error">{{ form.error }}</p>

      <div class="form-actions">
        <button class="btn btn-secondary" @click="view = 'list'">Cancelar</button>
        <button class="btn btn-primary" @click="saveRecipe">Guardar receta</button>
      </div>
    </section>

    <!-- Vista: detalle de una receta -->
    <section v-else-if="view === 'detail' && currentRecipe">
      <button class="btn btn-secondary" id="btn-back" @click="view = 'list'">&larr; Volver</button>
      <h2>{{ currentRecipe.name }}</h2>

      <div class="slider-container">
        <label>
          Porciones: <span id="detail-portions">{{ detailPortions }}</span>
        </label>
        <input type="range" id="detail-slider" min="1" max="50" step="1" v-model.number="detailPortions">
      </div>

      <table class="ingredients-table">
        <thead>
          <tr><th>Ingrediente</th><th>Cantidad</th><th>Unidad</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in detailRows" :key="row.idx">
            <td>{{ row.name }}</td>
            <td class="qty">{{ row.qty }}</td>
            <td>
              <select
                class="unit-select"
                :value="row.displayUnit"
                @change="currentRecipe.ingredients[row.idx].displayUnit = $event.target.value"
              >
                <option v-for="u in row.units" :key="u" :value="u">{{ u }}</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="detail-actions">
        <button class="btn btn-danger" @click="deleteCurrentRecipe">Eliminar receta</button>
      </div>
    </section>
  </main>
</template>
