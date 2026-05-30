<script>
  import {
    ArrowLeftRight,
    Calculator,
    Clipboard,
    RotateCcw,
    Ruler
  } from '@lucide/svelte';

  const categories = {
    length: {
      label: 'Longitud',
      base: 'm',
      units: {
        mm: { label: 'Milimetros', factor: 0.001 },
        cm: { label: 'Centimetros', factor: 0.01 },
        m: { label: 'Metros', factor: 1 },
        km: { label: 'Kilometros', factor: 1000 },
        in: { label: 'Pulgadas', factor: 0.0254 },
        ft: { label: 'Pies', factor: 0.3048 },
        yd: { label: 'Yardas', factor: 0.9144 },
        mi: { label: 'Millas', factor: 1609.344 }
      }
    },
    area: {
      label: 'Area',
      base: 'm2',
      units: {
        cm2: { label: 'Centimetros cuadrados', factor: 0.0001 },
        m2: { label: 'Metros cuadrados', factor: 1 },
        ha: { label: 'Hectareas', factor: 10000 },
        km2: { label: 'Kilometros cuadrados', factor: 1000000 },
        in2: { label: 'Pulgadas cuadradas', factor: 0.00064516 },
        ft2: { label: 'Pies cuadrados', factor: 0.09290304 },
        ac: { label: 'Acres', factor: 4046.8564224 }
      }
    },
    volume: {
      label: 'Volumen',
      base: 'l',
      units: {
        ml: { label: 'Mililitros', factor: 0.001 },
        l: { label: 'Litros', factor: 1 },
        m3: { label: 'Metros cubicos', factor: 1000 },
        tsp: { label: 'Cucharaditas', factor: 0.00492892159 },
        tbsp: { label: 'Cucharadas', factor: 0.0147867648 },
        cup: { label: 'Tazas', factor: 0.24 },
        floz: { label: 'Onzas liquidas', factor: 0.0295735296 },
        gal: { label: 'Galones', factor: 3.785411784 }
      }
    },
    weight: {
      label: 'Peso',
      base: 'kg',
      units: {
        mg: { label: 'Miligramos', factor: 0.000001 },
        g: { label: 'Gramos', factor: 0.001 },
        kg: { label: 'Kilogramos', factor: 1 },
        t: { label: 'Toneladas', factor: 1000 },
        oz: { label: 'Onzas', factor: 0.028349523125 },
        lb: { label: 'Libras', factor: 0.45359237 },
        st: { label: 'Stones', factor: 6.35029318 }
      }
    },
    temperature: {
      label: 'Temperatura',
      base: 'c',
      units: {
        c: {
          label: 'Celsius',
          toBase: (value) => value,
          fromBase: (value) => value
        },
        f: {
          label: 'Fahrenheit',
          toBase: (value) => (value - 32) * 5 / 9,
          fromBase: (value) => value * 9 / 5 + 32
        },
        k: {
          label: 'Kelvin',
          toBase: (value) => value - 273.15,
          fromBase: (value) => value + 273.15
        }
      }
    },
    speed: {
      label: 'Velocidad',
      base: 'mps',
      units: {
        mps: { label: 'Metros por segundo', factor: 1 },
        kph: { label: 'Kilometros por hora', factor: 0.2777777778 },
        mph: { label: 'Millas por hora', factor: 0.44704 },
        knot: { label: 'Nudos', factor: 0.5144444444 }
      }
    },
    time: {
      label: 'Tiempo',
      base: 's',
      units: {
        ms: { label: 'Milisegundos', factor: 0.001 },
        s: { label: 'Segundos', factor: 1 },
        min: { label: 'Minutos', factor: 60 },
        h: { label: 'Horas', factor: 3600 },
        d: { label: 'Dias', factor: 86400 },
        wk: { label: 'Semanas', factor: 604800 }
      }
    }
  };

  let categoryId = 'length';
  let inputValue = '1';
  let fromUnit = 'm';
  let toUnit = 'cm';
  let copied = false;

  $: category = categories[categoryId];
  $: unitEntries = Object.entries(category.units);
  $: numericValue = Number(inputValue);
  $: isValidValue = inputValue !== '' && Number.isFinite(numericValue);
  $: result = isValidValue ? convert(numericValue, fromUnit, toUnit, category) : null;
  $: resultText = result === null ? '-' : formatNumber(result);

  function convert(value, from, to, selectedCategory) {
    const source = selectedCategory.units[from];
    const target = selectedCategory.units[to];

    if ('toBase' in source) {
      return target.fromBase(source.toBase(value));
    }

    return value * source.factor / target.factor;
  }

  function formatNumber(value) {
    if (Math.abs(value) >= 1000000 || (Math.abs(value) > 0 && Math.abs(value) < 0.0001)) {
      return value.toExponential(6).replace(/\.?0+e/, 'e');
    }

    return new Intl.NumberFormat('es-CL', {
      maximumFractionDigits: 8
    }).format(Number(value.toFixed(8)));
  }

  function setCategory(nextCategoryId) {
    const unitKeys = Object.keys(categories[nextCategoryId].units);
    categoryId = nextCategoryId;
    fromUnit = unitKeys[0];
    toUnit = unitKeys[1] ?? unitKeys[0];
    copied = false;
  }

  function swapUnits() {
    [fromUnit, toUnit] = [toUnit, fromUnit];
    copied = false;
  }

  function clearValue() {
    inputValue = '';
    copied = false;
  }

  async function copyResult() {
    if (result === null || !navigator.clipboard) return;
    await navigator.clipboard.writeText(String(result));
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 1400);
  }
</script>

<svelte:head>
  <meta name="description" content="MyUnits, convertidor simple de unidades." />
</svelte:head>

<main class="app-shell">
  <section class="topbar" aria-label="Encabezado">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true"><Ruler size={26} strokeWidth={2.4} /></span>
      <div>
        <h1>MyUnits</h1>
        <p>Convertidor rapido de unidades</p>
      </div>
    </div>
  </section>

  <section class="converter" aria-label="Convertidor">
    <div class="category-tabs" role="tablist" aria-label="Tipo de unidad">
      {#each Object.entries(categories) as [id, item]}
        <button
          type="button"
          class:active={id === categoryId}
          aria-selected={id === categoryId}
          role="tab"
          on:click={() => setCategory(id)}
        >
          {item.label}
        </button>
      {/each}
    </div>

    <div class="panel">
      <div class="field value-field">
        <label for="value">Valor</label>
        <input
          id="value"
          type="number"
          inputmode="decimal"
          step="any"
          bind:value={inputValue}
          placeholder="Ingresa un numero"
        />
      </div>

      <div class="unit-grid">
        <label class="field" for="from-unit">
          Desde
          <select id="from-unit" bind:value={fromUnit} on:change={() => copied = false}>
            {#each unitEntries as [id, unit]}
              <option value={id}>{unit.label}</option>
            {/each}
          </select>
        </label>

        <button
          type="button"
          class="icon-button swap-button"
          on:click={swapUnits}
          aria-label="Invertir unidades"
          title="Invertir unidades"
        >
          <ArrowLeftRight size={22} />
        </button>

        <label class="field" for="to-unit">
          Hacia
          <select id="to-unit" bind:value={toUnit} on:change={() => copied = false}>
            {#each unitEntries as [id, unit]}
              <option value={id}>{unit.label}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="result-band" aria-live="polite">
        <span class="result-label">Resultado</span>
        <strong>{resultText}</strong>
        <span class="result-unit">{category.units[toUnit].label}</span>
      </div>

      <div class="actions">
        <button type="button" class="secondary-button" on:click={clearValue}>
          <RotateCcw size={18} />
          Limpiar
        </button>
        <button type="button" class="primary-button" on:click={copyResult} disabled={result === null}>
          <Clipboard size={18} />
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  </section>

  <section class="summary" aria-label="Conversion inversa">
    <Calculator size={20} />
    {#if result === null}
      <p>Ingresa un valor para calcular la conversion.</p>
    {:else}
      <p>
        {formatNumber(numericValue)} {category.units[fromUnit].label}
        =
        {resultText} {category.units[toUnit].label}
      </p>
    {/if}
  </section>
</main>
