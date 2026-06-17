<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminListCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory, adminListLessons, adminCreateLesson, adminDeleteLesson, adminListPapers, adminDeletePaper } from '@/api/modules/exercise'
import api from '@/api/index'
import { ElMessage, ElMessageBox } from 'element-plus'

const grade = ref(''); const subject = ref('')
const grades = ['一年级','二年级','三年级','四年级','五年级','六年级','七年级','八年级','九年级','高一','高二','高三']
const subjects = ['语文','数学','英语','物理','化学','生物','政治','历史','地理','科学']

const unitCats = ref<any[]>([]); const topicCats = ref<any[]>([]); const examCats = ref<any[]>([])
const unitPapers = ref<Record<string,any[]>>({}); const topicPapers = ref<Record<string,any[]>>({}); const examPapers = ref<Record<string,any[]>>({})
const syncLessons = ref<any[]>([]); const syncLessonPapers = ref<Record<string,any[]>>({})
const activePanel = ref('unit')

// 对话框
const dialog = ref(false); const dialogTitle = ref(''); const dialogForm = ref<any>({})
const uploadDialog = ref(false); const uploadForm = ref({ title:'', categoryId:'', lessonId:'', file:null as File|null })
const uploading = ref(false)

onMounted(()=>loadAll())
async function loadAll() {
  if(!grade.value||!subject.value) return
  const params = { grade:grade.value, subject:subject.value }
  // 单元练
  unitCats.value = await adminListCategories({...params,type:'unit'})
  for(const c of unitCats.value) { unitPapers.value[c.id] = await adminListPapers(c.id) }
  // 同步练
  const unitLessons: any[] = []
  for(const c of unitCats.value) {
    const lessons = await adminListLessons(c.id)
    for(const l of lessons) { syncLessonPapers.value[l.id] = await adminListPapers(undefined, l.id) }
    unitLessons.push(...lessons.map((l:any)=>({...l,unitName:c.name})))
  }
  syncLessons.value = unitLessons
  // 专题练
  topicCats.value = await adminListCategories({...params,type:'topic'})
  for(const c of topicCats.value) { topicPapers.value[c.id] = await adminListPapers(c.id) }
  // 期中期末
  examCats.value = await adminListCategories({...params,type:'exam'})
  for(const c of examCats.value) { examPapers.value[c.id] = await adminListPapers(c.id) }
}

// 类目 CRUD
function openNew(type:string) {
  dialogTitle.value='新建'+({unit:'单元',topic:'专题',exam:'考试类目'}[type]||type)
  dialogForm.value={type,grade:grade.value,subject:subject.value,name:''}
  dialog.value=true
}
function openEdit(cat:any) {
  dialogTitle.value='编辑'; dialogForm.value={...cat}
  dialog.value=true
}
async function saveCat() {
  try {
    if(dialogForm.value.id) { await adminUpdateCategory(dialogForm.value.id,dialogForm.value) }
    else { await adminCreateCategory(dialogForm.value) }
    ElMessage.success('已保存'); dialog.value=false; loadAll()
  } catch(e:any) { ElMessage.error(e?.message??'保存失败') }
}
async function delCat(id:string) {
  try { await ElMessageBox.confirm('删除此分类将同时删除下级课时和试卷，确认？','删除',{type:'warning'}); await adminDeleteCategory(id); ElMessage.success('已删除'); loadAll() } catch {}
}

// 课时
async function openNewLesson(unitId:string) {
  try { const {value:name}=await ElMessageBox.prompt('课时名称','新建课时') ; if(name) { await adminCreateLesson({unitId,name}); ElMessage.success('已创建'); loadAll() } } catch {}
}
async function delLesson(id:string) {
  try { await ElMessageBox.confirm('删除此课时将同时删除下辖试卷','删除',{type:'warning'}); await adminDeleteLesson(id); ElMessage.success('已删除'); loadAll() } catch {}
}

// 试卷上传
function openUpload(categoryId?:string,lessonId?:string) {
  uploadForm.value={title:'',categoryId:categoryId||'',lessonId:lessonId||'',file:null}
  uploadDialog.value=true
}
function onFileChange(e:Event) { uploadForm.value.file=(e.target as HTMLInputElement).files?.[0]??null }
async function doUpload() {
  if(!uploadForm.value.title||!uploadForm.value.file){ElMessage.warning('请填写标题并选择文件');return}
  uploading.value=true
  try {
    const fd=new FormData(); fd.append('file',uploadForm.value.file); fd.append('title',uploadForm.value.title)
    if(uploadForm.value.categoryId) fd.append('categoryId',uploadForm.value.categoryId)
    if(uploadForm.value.lessonId) fd.append('lessonId',uploadForm.value.lessonId)
    await api.post('/admin/exercise/papers', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    ElMessage.success('上传成功'); uploadDialog.value=false; loadAll()
  } catch(e:any) { ElMessage.error(e?.message??'上传失败') } finally { uploading.value=false }
}
async function delPaper(id:string) {
  try { await ElMessageBox.confirm('确认删除？','删除',{type:'warning'}); await adminDeletePaper(id); ElMessage.success('已删除'); loadAll() } catch {}
}
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">练习管理</h1></div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <el-select v-model="grade" placeholder="年级" clearable @change="loadAll"><el-option v-for="g in grades" :key="g" :label="g" :value="g"/></el-select>
      <el-select v-model="subject" placeholder="科目" clearable @change="loadAll"><el-option v-for="s in subjects" :key="s" :label="s" :value="s"/></el-select>
    </div>

    <el-collapse v-model="activePanel" v-if="grade&&subject">
      <!-- 单元练 -->
      <el-collapse-item title="📖 单元练" name="unit">
        <el-button type="primary" size="small" @click="openNew('unit')" class="mb-sm">+ 新建单元</el-button>
        <div v-for="c in unitCats" :key="c.id" class="cat-block">
          <div class="cat-header"><strong>{{ c.name }}</strong><span><el-button size="small" @click="openEdit(c)">编辑</el-button><el-button size="small" type="danger" @click="delCat(c.id)">删除</el-button></span></div>
          <div v-for="p in unitPapers[c.id]" :key="p.id" class="paper-row"><span>📄 {{ p.title }}</span><span class="text-secondary">{{ p.fileType }} · {{ p.downloadCount }}次下载</span><el-button size="small" type="danger" @click="delPaper(p.id)">删除</el-button></div>
          <el-button size="small" text @click="openUpload(c.id)">+ 上传试卷</el-button>
        </div>
      </el-collapse-item>

      <!-- 同步练 -->
      <el-collapse-item title="📚 同步练" name="sync">
        <div v-for="c in unitCats" :key="c.id" class="cat-block">
          <div class="cat-header"><strong>{{ c.name }}</strong> <el-button size="small" @click="openNewLesson(c.id)">+ 新建课时</el-button></div>
          <div v-for="l in syncLessons.filter(x=>x.unitId===c.id)" :key="l.id" class="lesson-block">
            <div class="lesson-header"><span>{{ l.name }}</span><span><el-button size="small" type="danger" @click="delLesson(l.id)">删除</el-button></span></div>
            <div v-for="p in syncLessonPapers[l.id]" :key="p.id" class="paper-row"><span>📄 {{ p.title }}</span><span class="text-secondary">{{ p.fileType }} · {{ p.downloadCount }}次下载</span><el-button size="small" type="danger" @click="delPaper(p.id)">删除</el-button></div>
            <el-button size="small" text @click="openUpload(undefined,l.id)">+ 上传试卷</el-button>
          </div>
        </div>
      </el-collapse-item>

      <!-- 专题练 -->
      <el-collapse-item title="🎯 专题练" name="topic">
        <el-button type="primary" size="small" @click="openNew('topic')" class="mb-sm">+ 新建专题</el-button>
        <div v-for="c in topicCats" :key="c.id" class="cat-block">
          <div class="cat-header"><strong>{{ c.name }}</strong><span><el-button size="small" @click="openEdit(c)">编辑</el-button><el-button size="small" type="danger" @click="delCat(c.id)">删除</el-button></span></div>
          <div v-for="p in topicPapers[c.id]" :key="p.id" class="paper-row"><span>📄 {{ p.title }}</span><span class="text-secondary">{{ p.fileType }} · {{ p.downloadCount }}次下载</span><el-button size="small" type="danger" @click="delPaper(p.id)">删除</el-button></div>
          <el-button size="small" text @click="openUpload(c.id)">+ 上传试卷</el-button>
        </div>
      </el-collapse-item>

      <!-- 期中期末 -->
      <el-collapse-item title="📋 期中期末练" name="exam">
        <el-button type="primary" size="small" @click="openNew('exam')" class="mb-sm">+ 新建考试类目</el-button>
        <div v-for="c in examCats" :key="c.id" class="cat-block">
          <div class="cat-header"><strong>{{ c.name }}</strong><span><el-button size="small" @click="openEdit(c)">编辑</el-button><el-button size="small" type="danger" @click="delCat(c.id)">删除</el-button></span></div>
          <div v-for="p in examPapers[c.id]" :key="p.id" class="paper-row"><span>📄 {{ p.title }}</span><span class="text-secondary">{{ p.fileType }} · {{ p.downloadCount }}次下载</span><el-button size="small" type="danger" @click="delPaper(p.id)">删除</el-button></div>
          <el-button size="small" text @click="openUpload(c.id)">+ 上传试卷</el-button>
        </div>
      </el-collapse-item>
    </el-collapse>

    <!-- 类目编辑对话框 -->
    <el-dialog v-model="dialog" :title="dialogTitle" width="400px">
      <el-input v-model="dialogForm.name" placeholder="名称" size="large"/>
      <template #footer><el-button @click="dialog=false">取消</el-button><el-button type="primary" @click="saveCat">保存</el-button></template>
    </el-dialog>

    <!-- 上传对话框 -->
    <el-dialog v-model="uploadDialog" title="上传试卷" width="400px">
      <el-input v-model="uploadForm.title" placeholder="试卷标题" size="large" class="mb-sm"/>
      <input type="file" accept=".pdf,.docx" @change="onFileChange"/>
      <template #footer><el-button @click="uploadDialog=false">取消</el-button><el-button type="primary" :loading="uploading" @click="doUpload">上传</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.cat-block{margin-bottom:$spacing-md;border:1px solid $border-color;border-radius:$border-radius;padding:$spacing-md}
.cat-header,.lesson-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:$spacing-sm}
.lesson-block{margin-left:$spacing-lg;margin-bottom:$spacing-sm;padding:$spacing-sm;background:#fafafa;border-radius:$border-radius}
.paper-row{display:flex;align-items:center;gap:$spacing-md;padding:6px 0;font-size:$font-size-sm}
</style>
