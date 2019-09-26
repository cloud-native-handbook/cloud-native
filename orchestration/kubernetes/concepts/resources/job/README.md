# Job

## 重启策略

Job 有两种重启策略：`Never` 和 `OnFailure`，但没有 `Always`。而 Pod 只有 `Never` 和 `Always`，没有 `OnFailure`。

* Never

当 Job 运行失败时，它对应的 Pod 不会重启，但由于一直无法达到期望的状态，所以会一直创建新的 Pod。为避免一直创建新的 Pod，可以通过 `.spec.backoffLimit` 限制重试次数，其默认值为 `6`。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: never-restart-job
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: cmd
        image: busybox
        imagePullPolicy: IfNotPresent
        command: ["unvalid-command"]
EOF
```

```bash
# 没有指定 spec.backoffLimit
$ kubectl get pod  -l job-name=never-restart-job --show-all
NAME                      READY     STATUS               RESTARTS   AGE
never-restart-job-5dkcj   0/1       ContainerCannotRun   0          10m
never-restart-job-7rzv6   0/1       ContainerCannotRun   0          9m
never-restart-job-b6fs5   0/1       ContainerCannotRun   0          8m
never-restart-job-b79vz   0/1       ContainerCannotRun   0          10m
never-restart-job-b96cr   0/1       ContainerCannotRun   0          10m
never-restart-job-d7h8x   0/1       ContainerCannotRun   0          7m
never-restart-job-qb4gb   0/1       ContainerCannotRun   0          9m

```

默认值：

spec.backoffLimit 6
spec.completions 1
spec.parallelism 1

* OnFailure

`OnFailure`

## CronJob（定时 Job）


## 参考

* [Kubernetes Job Controller 源码分析](http://blog.csdn.net/WaltonWang/article/details/78056620)
