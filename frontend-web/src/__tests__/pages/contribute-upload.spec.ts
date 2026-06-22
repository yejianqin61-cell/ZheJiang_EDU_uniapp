import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContributeUploadPage from '@/pages/contribute/upload/index.vue'

const routerPush = vi.fn()
const contributionApiMocks = vi.hoisted(() => ({
  uploadContributionFile: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/modules/contribution', () => ({
  uploadContributionFile: contributionApiMocks.uploadContributionFile,
}))

const mountPage = () =>
  mount(ContributeUploadPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-progress': { props: ['percentage', 'status'], template: '<div>{{ percentage }} {{ status }}</div>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Contribute upload page', () => {
  beforeEach(() => {
    routerPush.mockReset()
    contributionApiMocks.uploadContributionFile.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('warns when subject or grade is missing', async () => {
    const wrapper = mountPage()

    await (wrapper.vm as any).submit()

    expect(ElMessage.warning).toHaveBeenCalledWith('请选择学科和年级')
    expect(contributionApiMocks.uploadContributionFile).not.toHaveBeenCalled()
  })

  it('warns when file is missing', async () => {
    const wrapper = mountPage()
    ;(wrapper.vm as any).form.subject = '数学'
    ;(wrapper.vm as any).form.grade = '五年级'

    await (wrapper.vm as any).submit()

    expect(ElMessage.warning).toHaveBeenCalledWith('请选择文件')
  })

  it('uploads contribution file, reports progress and redirects on success', async () => {
    contributionApiMocks.uploadContributionFile.mockImplementation(async (_formData, config) => {
      config?.onUploadProgress?.({ loaded: 4, total: 10 } as any)
      config?.onUploadProgress?.({ loaded: 10, total: 10 } as any)
      return { ok: true }
    })

    const wrapper = mountPage()
    ;(wrapper.vm as any).form.subject = '数学'
    ;(wrapper.vm as any).form.grade = '五年级'
    ;(wrapper.vm as any).form.file = new File(['demo'], 'questions.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    await (wrapper.vm as any).submit()

    expect(contributionApiMocks.uploadContributionFile).toHaveBeenCalledTimes(1)
    expect((wrapper.vm as any).uploadPercent).toBe(100)
    expect(ElMessage.success).toHaveBeenCalledWith('上传成功，AI解析中...')
    expect(routerPush).toHaveBeenCalledWith('/contribute')
  })

  it('shows upload error message when request fails', async () => {
    contributionApiMocks.uploadContributionFile.mockRejectedValue(new Error('上传服务异常'))

    const wrapper = mountPage()
    ;(wrapper.vm as any).form.subject = '数学'
    ;(wrapper.vm as any).form.grade = '五年级'
    ;(wrapper.vm as any).form.file = new File(['demo'], 'questions.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    await (wrapper.vm as any).submit()

    expect(ElMessage.error).toHaveBeenCalledWith('上传服务异常')
  })
})
