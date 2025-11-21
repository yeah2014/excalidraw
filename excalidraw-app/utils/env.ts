/**
 * 获取环境变量，支持运行时注入（window._env_）和构建时注入（import.meta.env）
 * 优先级：window._env_ > import.meta.env > 默认值
 */
export function getEnvVar(key: string, defaultValue: string = ""): string {
  // 优先从运行时环境变量读取（支持 dynamic-env.Dockerfile）
  if (typeof window !== "undefined" && (window as any)._env_) {
    const runtimeValue = (window as any)._env_[key];
    if (runtimeValue !== undefined && runtimeValue !== null && runtimeValue !== "") {
      return String(runtimeValue);
    }
  }
  
  // 从构建时环境变量读取
  const buildTimeValue = import.meta.env[key as keyof typeof import.meta.env];
  if (buildTimeValue !== undefined && buildTimeValue !== null && buildTimeValue !== "") {
    return String(buildTimeValue);
  }
  
  return defaultValue;
}

