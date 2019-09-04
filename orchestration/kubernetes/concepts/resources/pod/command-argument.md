# Pod 容器命令及参数

创建 Pod 时，可以为 Pod 中的容器定义运行的命令和参数。创建 Pod 后，无法改变 Pod 中定义的命令和参数。

配置文件中定义的命令和参数将覆盖容器中定义的命令和参数。如果只定义了参数而没有定义命令，将使用容器命令及新参数。

Docker 和 Kubernetes 使用的字段存在一定的差别：

| Docker 字段  | Kubernetes 字段 | 描述           |
| ------------ | --------------- | -------------- |
| `ENTRYPOINT` | `command`       | 容器运行的命令 |
| `CMD`        | `args`          | 命令参数       |

当几个命令相互交错时：

| Dockerfile.ENTRYPOINT | Dockerfile.CMD | POD.spec.containers[].command | POD.spec.containers[].args | 运行结果         |
| --------------------- | -------------- | ----------------------------- | -------------------------- | ---------------- |
| `[/ep-1]`             | `[foo bar]`    |                               |                            | `[ep-1 foo bar]` |
| `[/ep-1]`             | `[foo bar]`    | `[/ep-2]`                     |                            | `[ep-2]`         |
| `[/ep-1]`             | `[foo bar]`    |                               | `[zoo boo]`                | `[ep-1 zoo boo]` |
| `[/ep-1]`             | `[foo bar]`    | `[/ep-2]`                     | `[zoo boo]`                | `[ep-2 zoo boo]` |

```yaml
env:
- name: MSG
  value: "hello world"
command: ["/bin/echo"]
args: ["$(MSG)"]
```

> 如果要在 command 或 args 中获取环境变量的值，可以使用 `$(VAR_NAME)`。

建议：Dockerfile `ENTRYPOINT` 与 Container `args` 一起结合。

> https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/#
