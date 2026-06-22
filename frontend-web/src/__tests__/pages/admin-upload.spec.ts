import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import type { ComponentPublicInstance } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUploadPage from '@/pages/admin/upload/index.vue'

const adminApiMocks = vi.hoisted(() => ({
  uploadFile: vi.fn(),
}))

vi.mock('@/api/modules/admin', () => ({
  uploadFile: adminApiMocks.uploadFile,
}))

const mountPage = () =>
  mount(AdminUploadPage, {
    global: {
      stubs: {
        'el-row': { template: '<div><slot /></div>' },
        'el-col': { template: '<div><slot /></div>' },
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-progress': { props: ['percentage', 'status'], template: '<div>{{ percentage }} {{ status }}</div>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

type UploadForm = {
  subject: string
  grade: string
}

type AdminUploadPageVm = ComponentPublicInstance & {
  form: UploadForm
  file: File | null
  uploadPercent: number
  submit(): Promise<void>
}

const getPageVm = (wrapper: VueWrapper<ComponentPublicInstance>) => wrapper.vm as AdminUploadPageVm

const buildUploadProgressEvent = (loaded: number, total: number): AxiosProgressEvent => ({
  loaded,
  total,
  lengthComputable: true,
  bytes: loaded,
  progress: total ? loaded / total : undefined,
  estimated: 0,
  rate: undefined,
  upload: true,
  download: false,
  event: undefined,
 })

describe('Admin upload page', () => {
  beforeEach(() => {
    adminApiMocks.uploadFile.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('warns when subject or grade is missing', async () => {
    const wrapper = mountPage()

    await getPageVm(wrapper).submit()

    expect(ElMessage.warning).toHaveBeenCalledWith('请选择学科和年级')
    expect(adminApiMocks.uploadFile).not.toHaveBeenCalled()
  })

  it('warns when file is missing', async () => {
    const wrapper = mountPage()
    const vm = getPageVm(wrapper)
    vm.form.subject = '数学'
    vm.form.grade = '五年级'

    await vm.submit()

    expect(ElMessage.warning).toHaveBeenCalledWith('请选择文件')
    expect(adminApiMocks.uploadFile).not.toHaveBeenCalled()
  })

  it('uploads selected file, reports progress and resets form on success', async () => {
    adminApiMocks.uploadFile.mockImplementation(async (_formData: FormData, config?: AxiosRequestConfig<FormData>) => {
      config?.onUploadProgress?.(buildUploadProgressEvent(3, 10))
      config?.onUploadProgress?.(buildUploadProgressEvent(10, 10))
      return { ok: true }
    })

    const wrapper = mountPage()
    const vm = getPageVm(wrapper)
    vm.form.subject = '数学'
    vm.form.grade = '五年级'
    vm.file = new File(['demo'], 'paper.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    await vm.submit()

    expect(adminApiMocks.uploadFile).toHaveBeenCalledTimes(1)
    expect(vm.uploadPercent).toBe(100)
    expect(ElMessage.success).toHaveBeenCalledWith('上传成功，AI解析中...')
    expect(vm.form).toEqual({ subject: '', grade: '' })
    expect(vm.file).toBeNull()
  })
})
