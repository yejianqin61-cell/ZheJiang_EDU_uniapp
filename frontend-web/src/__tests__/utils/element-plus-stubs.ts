import { defineComponent, h } from 'vue'

function normalizeValue(value: unknown) {
  return value == null ? '' : String(value)
}

export const elInputStub = defineComponent({
  name: 'ElInputStub',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    type: {
      type: String,
      default: 'text',
    },
    placeholder: {
      type: String,
      default: '',
    },
    maxlength: {
      type: [String, Number],
      default: undefined,
    },
  },
  emits: ['update:modelValue', 'keyup.enter'],
  setup(props, { emit, slots }) {
    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement
      emit('update:modelValue', target.value)
    }

    const handleKeyup = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        emit('keyup.enter', event)
      }
    }

    return () => {
      const fieldProps = {
        value: normalizeValue(props.modelValue),
        placeholder: props.placeholder,
        maxlength: props.maxlength,
        onInput: handleInput,
        onKeyup: handleKeyup,
      }

      const field = props.type === 'textarea'
        ? h('textarea', fieldProps)
        : h('input', { ...fieldProps, type: props.type })

      return h('div', [field, ...(slots.append?.() ?? [])])
    }
  },
})
