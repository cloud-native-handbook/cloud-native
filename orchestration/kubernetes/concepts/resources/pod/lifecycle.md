# Pod 生命周期

## Pod 阶段

| 阶段    | 描述 |
| ------- | ---- |
| Pending |      |

## 容器生命周期钩子

容器生命周期钩子（Container Lifecycle Hooks）监听容器生命周期的特定事件，并在事件发生时执行已注册的回调函数。支持两种钩子：

  * postStart：容器启动后执行，注意由于是异步执行，它无法保证一定在 ENTRYPOINT 之后运行。如果失败，容器会被杀死，并根据 RestartPolicy 决定是否重启；
  * preStop：容器停止前执行，常用于资源清理。如果失败，容器同样也会被杀死。

而钩子的回调函数支持两种方式：

  * exec：在容器内执行命令
  * httpGet：向指定 URL 发起 GET 请求

postStart 和 preStop钩子示例：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: lifecycle-demo
spec:
  containers:
  - name: lifecycle-demo-container
    image: nginx
    lifecycle:
      postStart:
        exec:
          command: ["/bin/sh", "-c", "echo Hello from the postStart handler > /usr/share/message"]
      preStop:
        exec:
          command: ["/usr/sbin/nginx","-s","quit"]
```

## 参考

* [Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
