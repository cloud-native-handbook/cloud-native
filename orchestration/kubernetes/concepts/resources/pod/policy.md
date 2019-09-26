# Pod 策略

## 重启策略（`Pod.spec.restartPolicy`）

支持三种 RestartPolicy：

  * Always：只要退出就重启
  * OnFailure：失败退出（exit code 不等于 0）时重启
  * Never：只要退出就不再重启

| 重启策略    | 描述                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `Always`    | 只要退出就重启                                                                                              |
| `OnFailure` | 失败退出时重启；取决于 livenessPorbe 的返回值，如果没有指定 livenessPorbe，将判断 exit code != 0 则认为失败 |
| `Never`     | 退出就不再重启                                                                                              |

注意，这里的重启是指在 Pod 所在 Node 上面本地重启，并不会调度到其他 Node 上去。

## DNS 策略（`Pod.spec.dnsPolicy`）

通过 spec.dnsPolicy 参数，可以设置 Pod 中容器访问 DNS 的策略

  * ClusterFirst（配置）：优先基于 cluster domain 后缀，通过 kube-dns 查询；
  * Default：优先从 kubelet 中配置的 DNS 查询。

| DNS 策略       | 描述 |
| -------------- | ---- |
| `ClusterFirst` |      |
| `Default`      |      |

```yaml
```
