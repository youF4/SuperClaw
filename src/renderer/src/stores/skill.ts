import { defineStore } from 'pinia'
import { ref } from 'vue'
import gatewayApi from '@/lib/gateway'
import { notify } from '@/composables/useNotification'

export interface Skill {
  id: string
  name: string
  description: string
  version: string
  author?: string
  enabled: boolean
  installed: boolean
  category?: string
}

export const useSkillStore = defineStore('skill', () => {
  const skills = ref<Skill[]>([])
  const installedSkills = ref<Skill[]>([])
  const loading = ref(false)
  const searching = ref(false)

  // 获取已安装技能
  async function fetchInstalledSkills() {
    loading.value = true
    try {
      const response = await gatewayApi.skills.status()
      if (response.ok && response.result) {
        installedSkills.value = response.result as Skill[]
      } else {
        notify(`获取已安装技能失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`获取已安装技能出错: ${e}`, 'error')
    }
    loading.value = false
  }

  // 搜索技能
  async function searchSkills(query: string) {
    searching.value = true
    try {
      const response = await gatewayApi.skills.search(query)
      if (response.ok && response.result) {
        skills.value = response.result as Skill[]
      } else {
        notify(`搜索技能失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`搜索技能出错: ${e}`, 'error')
    }
    searching.value = false
  }

  // 安装技能
  async function installSkill(skillId: string) {
    try {
      const response = await gatewayApi.skills.install(skillId)
      if (response.ok) {
        await fetchInstalledSkills()
        notify('技能安装成功', 'success')
        return true
      }
      notify(`安装技能失败: ${response.error || '未知错误'}`, 'error')
    } catch (e) {
      notify(`安装技能出错: ${e}`, 'error')
    }
    return false
  }

  // 更新技能
  async function updateSkill(skillId: string) {
    try {
      const response = await gatewayApi.skills.update(skillId)
      if (response.ok) {
        notify('技能更新成功', 'success')
      } else {
        notify(`更新技能失败: ${response.error || '未知错误'}`, 'error')
      }
      return response.ok
    } catch (e) {
      notify(`更新技能出错: ${e}`, 'error')
    }
    return false
  }

  // 卸载技能
  async function uninstallSkill(skillId: string) {
    try {
      const response = await gatewayApi.skills.uninstall(skillId)
      if (response.ok) {
        await fetchInstalledSkills()
        notify('技能已卸载', 'info')
        return true
      }
      notify(`卸载技能失败: ${response.error || '未知错误'}`, 'error')
    } catch (e) {
      notify(`卸载技能出错: ${e}`, 'error')
    }
    return false
  }

  return {
    skills,
    installedSkills,
    loading,
    searching,
    fetchInstalledSkills,
    searchSkills,
    installSkill,
    updateSkill,
    uninstallSkill,
  }
})
