import { defineStore } from 'pinia'
import { ref } from 'vue'
import gatewayApi from '@/lib/gateway'
import { notify } from '@/composables/useNotification'

export interface CronJob {
  id: string
  name: string
  schedule: string
  command: string
  enabled: boolean
  lastRun?: number
  nextRun?: number
}

export const useCronStore = defineStore('cron', () => {
  const jobs = ref<CronJob[]>([])
  const loading = ref(false)

  // 获取所有定时任务
  async function fetchJobs() {
    loading.value = true
    try {
      const response = await gatewayApi.cron.list()
      if (response.ok && response.result) {
        jobs.value = response.result as CronJob[]
      } else {
        notify(`获取定时任务失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`获取定时任务出错: ${e}`, 'error')
    }
    loading.value = false
  }

  // 添加定时任务
  async function addJob(job: Omit<CronJob, 'id'>) {
    try {
      const response = await gatewayApi.cron.add(job)
      if (response.ok) {
        await fetchJobs()
        notify('定时任务创建成功', 'success')
        return true
      }
      notify(`创建定时任务失败: ${response.error || '未知错误'}`, 'error')
    } catch (e) {
      notify(`创建定时任务出错: ${e}`, 'error')
    }
    return false
  }

  // 删除定时任务
  async function removeJob(jobId: string) {
    try {
      const response = await gatewayApi.cron.remove(jobId)
      if (response.ok) {
        jobs.value = jobs.value.filter((j) => j.id !== jobId)
        notify('定时任务已删除', 'info')
        return true
      }
      notify(`删除定时任务失败: ${response.error || '未知错误'}`, 'error')
    } catch (e) {
      notify(`删除定时任务出错: ${e}`, 'error')
    }
    return false
  }

  // 立即运行定时任务
  async function runJob(jobId: string) {
    try {
      const response = await gatewayApi.cron.run(jobId)
      if (response.ok) {
        notify('任务已触发执行', 'success')
      } else {
        notify(`执行定时任务失败: ${response.error || '未知错误'}`, 'error')
      }
      return response.ok
    } catch (e) {
      notify(`执行定时任务出错: ${e}`, 'error')
    }
    return false
  }

  return {
    jobs,
    loading,
    fetchJobs,
    addJob,
    removeJob,
    runJob,
  }
})
