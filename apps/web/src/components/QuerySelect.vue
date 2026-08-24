<script setup lang="ts">
import { Check, ChevronDown } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

export interface QuerySelectOption {
  value: string;
  label: string;
}

const props = defineProps<{
  label: string;
  modelValue: string;
  options: readonly QuerySelectOption[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const optionButtons = ref<Array<HTMLButtonElement | null>>([]);
const open = ref(false);
const activeIndex = ref(0);
const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue) ?? props.options[0]);

function focusActiveOption() {
  void nextTick(() => optionButtons.value[activeIndex.value]?.focus());
}

function openMenu() {
  activeIndex.value = Math.max(0, props.options.findIndex((option) => option.value === props.modelValue));
  open.value = true;
  focusActiveOption();
}

function toggle() {
  if (open.value) {
    open.value = false;
  } else {
    openMenu();
  }
}

function choose(option: QuerySelectOption) {
  emit("update:modelValue", option.value);
  open.value = false;
}

function handleDocumentPointerdown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false;
}

function handleTriggerKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    open.value = false;
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openMenu();
  }
}

function handleOptionKeydown(event: KeyboardEvent, index: number) {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    activeIndex.value = (index + direction + props.options.length) % props.options.length;
    focusActiveOption();
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const option = props.options[index];
    if (option) choose(option);
  } else if (event.key === "Escape") {
    event.preventDefault();
    open.value = false;
    trigger.value?.focus();
  }
}

function setOptionRef(element: unknown, index: number) {
  optionButtons.value[index] = element as HTMLButtonElement | null;
}

onMounted(() => document.addEventListener("pointerdown", handleDocumentPointerdown));
onBeforeUnmount(() => document.removeEventListener("pointerdown", handleDocumentPointerdown));
</script>

<template>
  <div ref="root" class="themed-select" :class="{ open }">
    <button
      ref="trigger"
      type="button"
      class="themed-select-trigger"
      :aria-label="label"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
      @keydown="handleTriggerKeydown"
    >
      <span>{{ selectedOption?.label ?? "请选择" }}</span>
      <ChevronDown :size="14" aria-hidden="true" />
    </button>
    <div v-if="open" class="themed-select-menu" role="listbox" :aria-label="label">
      <button
        v-for="(option, index) in options"
        :key="option.value"
        type="button"
        class="themed-select-option"
        :class="{ selected: option.value === modelValue, active: index === activeIndex }"
        role="option"
        :aria-selected="option.value === modelValue"
        :ref="(element) => setOptionRef(element, index)"
        @keydown="handleOptionKeydown($event, index)"
        @click="choose(option)"
      >
        <span>{{ option.label }}</span>
        <Check v-if="option.value === modelValue" :size="13" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
