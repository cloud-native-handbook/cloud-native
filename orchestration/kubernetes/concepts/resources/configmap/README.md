# ConfigMap

## API 版本

| K8s 版本 | API 版本 |
| -------- | -------- |
| v1.2     |          |

## 挂载 ConfigMap 作为文件

需要注意几点：

* 一旦你挂载了一个卷（不管是configmap还是别的），它就会覆盖 `mountPath`，所以在你的情况下， `/app` 文件夹将只包含 `settings.json`。
* 所以你必须指定mountPath：/app/settings.json，只有这样，/ app文件夹中的原始内容才不会受到影响。
* 如果 `mountPath` 挂载的目录不存在，系统会自动创建；

错误用法：

这种方式会覆盖 `/ethproxy` 下的所有文件。优点是更新 ConfigMap （`kubectl edit` 或 `kubectl apply`）会自动更新配置文件（约 40s ~ 60s）

```yaml
containers:
- volumeMounts:
  - name: config-volume
    mountPath: /ethproxy
volumes:
- name: config-volume
  configMap:
    name: ethproxy-config
    items:
    - key: eth-proxy.conf
      path: eth-proxy.conf
```


正确方式：

缺点是更新 ConfigMap 不会自动更新配置，如果要要更新只能重新部署。

```yaml
containers:
- volumeMounts:
  - name: demo-config
    mountPath: /app/settings.json
    subPath: settings.json
volumes:
- name: demo-config
  configMap:
    name: demo
```

```bash
$ kubectl -n ethereum exec `kubectl -n ethereum get pods -l app=test-proxy  -o=name|cut -d "/" -f2` cat /ethproxy/eth-proxy.conf
```



## 参考

* [configmap file mount path results in command not found error](https://github.com/kubernetes/kubernetes/issues/44815)
