# Pod hosts

## 自定义 hosts

默认情况下，容器的 `/etc/hosts` 是 kubelet 自动生成的，并且仅包含 localhost 和 podName 等。不建议在容器内直接修改 /etc/hosts 文件，因为在 Pod 启动或重启时会被覆盖。

从 v1.7 开始，可以通过 pod.Spec.HostAliases 来增加 hosts 内容，如

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostaliases-pod
spec:
  hostAliases:
  - ip: "127.0.0.1"
    hostnames:
    - "foo.local"
    - "bar.local"
  - ip: "10.1.2.3"
    hostnames:
    - "foo.remote"
    - "bar.remote"
  containers:
  - name: cat-hosts
    image: busybox
    command:
    - cat
    args:
    - "/etc/hosts"
```
