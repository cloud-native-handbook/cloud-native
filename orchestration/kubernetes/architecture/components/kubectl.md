# Kubectl

## 代理 API Server

```bash
$ kubectl proxy --address='0.0.0.0' --port=8080 --accept-hosts='^*$'
```

疑问：被认证和授权的用户是否可能通过这种方式越权访问 apiserver？


## 自动补全

```bash
$ source <(kubectl completion bash)
```

## 别名

```bash
$ alias k8s='kubectl --kubeconfig ~/.kube/config'

# k8s dev get node
$ alias k8s='kubectl -n $1'
```


## 更新资源字段

```bash
$ kubectl patch storageclass rbd -p '{"metadata": {"annotations": {"storage.kubernetes.io/is-default-class": "true"}}}'
```

## 检查当前 context 是否有权限操作资源对象

```bash
$ kubectl auth can-i <list|create|edit|delete> pods
```


## 访问集群

* 方式一

```bash
kubectl --server=https://master_IP:6443 \
--certificate-authority=/etc/kubernetes/pki/ca.pem  \
--client-certificate=/etc/kubernetes/pki/admin.pem \
--client-key=/etc/kubernetes/pki/admin-key.pem \
```

## jsonpath

> https://kubernetes.io/docs/user-guide/jsonpath/

## kubectl logs

<!--
When you run kubectl logs as in the basic logging example, the kubelet on the node handles the request and reads directly from the log file, returning the contents in the response.
-->

使用 `kubectl logs` 命令请求查看 Pod 或容器日志时，API Server 会将请求转发给 Node 上的 kubelet，kubelet 处理该请求并直接读取容器日志文件（如：`/var/lib/docker/containers/*/*.log`），最后将结果响应给客户端。

<!--
Note: currently, if some external system has performed the rotation, only the contents of the latest log file will be available through kubectl logs. E.g. if there’s a 10MB file, logrotate performs the rotation and there are two files, one 10MB in size and one empty, kubectl logs will return an empty response.
-->

## kubetail

## kubectx

> https://github.com/ahmetb/kubectx

## 参考

* [Kubectl commands](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands)