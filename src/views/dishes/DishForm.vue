<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { UploadRawFile, UploadFile } from 'element-plus'
import { createDish, updateDish, getDish } from '../../api/dishes'
import { getCategories } from '../../api/categories'
import type { Category } from '../../types'

const route = useRoute()
const router = useRouter()
const isEdit = ref(false)
const dishId = ref<number | null>(null)
const loading = ref(false)
const submitting = ref(false)
const categories = ref<Category[]>([])

const serverUrl = import.meta.env.VITE_SERVER_URL

const form = ref({
  name: '',
  description: '',
  price: 0,
  category_id: null as number | null,
})
const imageUrl = ref('')
const imageFile = ref<File | null>(null)

onMounted(async () => {
  const res = await getCategories()
  categories.value = res.data

  const id = route.params.id
  if (id) {
    isEdit.value = true
    dishId.value = Number(id)
    loading.value = true
    try {
      const dishRes = await getDish(dishId.value)
      const d = dishRes.data
      form.value.name = d.name
      form.value.description = d.description
      form.value.price = d.price || 0
      form.value.category_id = d.category_id
      if (d.image_url) {
        imageUrl.value = serverUrl + d.image_url
      }
    } catch { /* ignore */ }
    finally { loading.value = false }
  }
})

function onFileChange(uploadFile: UploadFile) {
  const raw = uploadFile.raw
  if (raw) {
    imageFile.value = raw
    imageUrl.value = URL.createObjectURL(raw)
  }
}

function beforeUpload(file: UploadRawFile) {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

function handleRemove() {
  imageFile.value = null
  imageUrl.value = ''
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入菜品名称')
    return
  }
  if (!form.value.category_id) {
    ElMessage.warning('请选择分类')
    return
  }

  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('name', form.value.name)
    fd.append('description', form.value.description)
    fd.append('price', String(form.value.price))
    fd.append('category_id', String(form.value.category_id))
    if (imageFile.value) {
      fd.append('image', imageFile.value)
    }

    if (isEdit.value && dishId.value) {
      await updateDish(dishId.value, fd)
      ElMessage.success('更新成功')
    } else {
      await createDish(fd)
      ElMessage.success('添加成功')
    }
    router.push('/dishes')
  } catch { /* error handled by interceptor */ }
  finally { submitting.value = false }
}

function goBack() {
  router.push('/dishes')
}
</script>

<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="form-header">
        <el-button text @click="goBack">&larr; 返回</el-button>
        <span>{{ isEdit ? '编辑菜品' : '添加菜品' }}</span>
      </div>
    </template>

    <el-form label-width="80px" class="dish-form">
      <el-form-item label="菜品名称" required>
        <el-input v-model="form.name" placeholder="请输入菜品名称" />
      </el-form-item>
      <el-form-item label="分类" required>
        <el-select v-model="form.category_id" placeholder="请选择分类" style="width: 100%;">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入菜品描述" />
      </el-form-item>
      <el-form-item label="价格">
        <el-input-number v-model="form.price" :min="0" :precision="2" :step="1" placeholder="请输入价格" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="图片">
        <el-upload
          drag
          :auto-upload="false"
          :limit="1"
          :on-change="onFileChange"
          :before-upload="beforeUpload"
          :on-remove="handleRemove"
          :file-list="[]"
          accept="image/*"
          class="upload-wrap"
        >
          <template v-if="imageUrl">
            <img :src="imageUrl" class="upload-preview" />
          </template>
          <template v-else>
            <div class="upload-placeholder">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#62666d" stroke-width="1.5" stroke-linecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <div class="upload-text">
                将图片拖到此处，或<span class="upload-link">点击上传</span>
              </div>
            </div>
          </template>
          <template #tip>
            <div class="upload-tip">
              只能上传 jpg/png/gif 图片，且不超过 5MB
            </div>
          </template>
        </el-upload>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
        <el-button @click="goBack">取消</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<style scoped>
.form-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dish-form {
  max-width: 600px;
}

.upload-wrap {
  width: 100%;
}

.upload-preview {
  max-width: 280px;
  max-height: 180px;
  object-fit: contain;
}

.upload-placeholder {
  padding: 8px 0;
}

.upload-text {
  color: #8a8f98;
  font-size: 14px;
  margin-top: 8px;
}

.upload-link {
  color: #5e6ad2;
}

.upload-tip {
  color: #62666d;
  font-size: 12px;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .dish-form {
    max-width: 100%;
  }

  .upload-preview {
    max-width: 100%;
    max-height: 160px;
  }
}

@media (max-width: 480px) {
  .dish-form {
    --el-form-label-width: 56px;
  }

  .dish-form :deep(.el-form-item__label) {
    width: 56px !important;
    font-size: 13px;
    white-space: nowrap;
    padding-right: 6px;
  }

  .dish-form :deep(.el-form-item__content) {
    margin-left: 56px !important;
  }

  .upload-preview {
    max-height: 140px;
  }

  .upload-text {
    font-size: 12px;
  }
}
</style>
