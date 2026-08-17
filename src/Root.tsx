import { useEffect, useState } from 'react'
import App from './App.tsx'
import { DsPlatformBridge } from './platform/ds/DsPlatformBridge.tsx'
import { getStorageNamespace, onStorageNamespaceChange } from './game/storage'

/**
 * 存储命名空间（appKey + uid）变化时通过 key 重挂载 App：
 * 切换账号/登录完成后，游戏状态从对应账号的存档桶重新初始化，避免窜分。
 */
export default function Root() {
  const [namespace, setNamespace] = useState(getStorageNamespace)
  useEffect(() => onStorageNamespaceChange(setNamespace), [])
  return (
    <>
      <DsPlatformBridge />
      <App key={namespace} />
    </>
  )
}
