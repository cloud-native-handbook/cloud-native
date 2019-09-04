# Pod 初始化容器

Init Container 在所有容器运行之前执行（run-to-completion），常用来初始化配置。只有当初始化容器的 `command` 和/或 `args` 返回码为 `0` 时才会继续创建新的容器。

除此之外，还可以利用初始化容器实现 Swarm/Mesos 的 `depends_on` 功能，比如：启动 Slave 服务之前先检查 Master 服务是否已经启动。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-demo
spec:
  containers:
  - name: nginx
    image: nginx
    ports:
    - containerPort: 80
    volumeMounts:
    - name: workdir
      mountPath: /usr/share/nginx/html
  # These containers are run during pod initialization
  initContainers:
  - name: install
    image: busybox
    command:
    - wget
    - "-O"
    - "/work-dir/index.html"
    - http://kubernetes.io
    volumeMounts:
    - name: workdir
      mountPath: "/work-dir"
  dnsPolicy: Default
  volumes:
  - name: workdir
    emptyDir: {}
```

好像没有命令可以查看初始化容器的日志信息，但有其它办法查看其状态：

```bash
# status.initContainerStatuses
$ kubectl get pod init-demo -o yaml
```

在 `initContainers` 中执行 command/args 和在 `containers` 中执行 command/args 有何不同？

  1. `initContainers` 只要满足 command/args 的状态返回码为 `0` 即算初始化完成，之后将创建新的容器。
  2. `containers` 中的 command/args 要满足返回码为 `0` 且有一个持续进程一直运行，才算是容器健康。

可以测试一下用不同的方式运行 `sleep 30` 和 `cat /tmp` 两个操作。
