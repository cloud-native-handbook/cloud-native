# Pod 容器环境变量

## nodeName、podName、podIP 和 hostIP

可以通过 `POD.status` 获取 Pod IP 及 主机 IP。如果主机有多块网卡，获取到的是 kubelet 自动获取的 IP，或者 kubelet 的 `--node-ip` 参数指定的 IP。

* 使用 Pod 字段作为环境变量的值

```yaml
env:
- name: NODE_NAME
  valueFrom:
    fieldRef:
      fieldPath: spec.nodeName
- name: POD_NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metdata.namespace
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
- name: POD_IP
  valueFrom:
    fieldRef:
      fieldPath: status.podIP
- name: HOST_IP
  valueFrom:
    fieldRef:
      fieldPath: status.hostIP
```

* 使用 Container 字段作为环境变量的值

由于容器默认获得的是主机的总资源，如果希望从 `limits` 字段获取可以使用环境变量：

```yaml
env:
- name: CPU_REQUEST
  valueFrom:
    resourceFieldRef:
      containerName: spark
      resource: requests.cpu
- name: CPU_LIMIT
  valueFrom:
    resourceFieldRef:
      containerName: spark
      resource: limits.cpu
- name: MEMORY_REQUEST
  valueFrom:
    resourceFieldRef:
      containerName: spark
      resource: requests.memory
- name: MEMORY_LIMITS
  valueFrom:
    resourceFieldRef:
      containerName: spark
      resource: limits.memory
```

## 示例

* [Container Environment Variables](https://kubernetes.io/docs/concepts/containers/container-environment-variables/)
* [Expose Pod Information to Containers Through Environment Variables](https://kubernetes.io/docs/tasks/inject-data-application/environment-variable-expose-pod-information/)
