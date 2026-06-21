# Issue: 组卷配置页知识点未随年级切换刷新

- 日期：2026-06-21
- 模块：`frontend-web` / `src/pages/paper/config/index.vue`
- 严重级别：`P1`
- 状态：`已修复`

## 现象

在组卷配置页中，如果用户先选择学科，再选择年级，页面不会重新拉取该学科+年级组合对应的知识点。

## 影响

- 知识点区域可能继续显示旧条件下的数据，或保持空白。
- 用户无法基于最终选择的年级进行准确筛选。
- 会直接影响组卷入口链路的可用性和结果正确性。

## 根因

知识点拉取逻辑只挂在 `selectSubject()` 中，`selectGrade()` 仅修改了年级，没有触发知识点重载，也没有清理旧的知识点选择。

## 修复

1. 在 `selectGrade()` 中补充：
   - 清空 `knowledgePointIds`
   - 当学科已选中时，重新调用 `paper.fetchKnowledgePoints()`
2. 在 `selectSubject()` 中增加年级存在判断，避免条件不完整时发起无效请求。
3. 新增页级测试覆盖该交互路径。

## 验证

- `frontend-web` 测试通过
- `frontend-web` 构建通过
