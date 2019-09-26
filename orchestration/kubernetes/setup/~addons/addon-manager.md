# Addon-manager

## 部署

```bash
# 修改镜像源
$ sed -i "s|gcr.io/google-containers|dockerce|g" kube-addon-manager.yaml

# 部署
$ kubectl apply -f kube-addon-manager.yaml

# 检查
$ kubectl -n kube-system get pod -l component=kube-addon-manager

# 排错
$ kubectl -n kube-system logs -f kube-addon-manager
```

[kube-addon-manager.yaml](https://github.com/kubernetes/kubernetes/blob/master/cluster/saltbase/salt/kube-addons/kube-addon-manager.yaml):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-addon-manager
  namespace: kube-system
  annotations:
    scheduler.alpha.kubernetes.io/critical-pod: ''
  labels:
    component: kube-addon-manager
spec:
  hostNetwork: true
  containers:
  - name: kube-addon-manager
    # When updating version also bump it in:
    # - test/kubemark/resources/manifests/kube-addon-manager.yaml
    image: gcr.io/google-containers/kube-addon-manager:v6.5
    command:
    - /bin/bash
    - -c
    - /opt/kube-addons.sh 1>>/var/log/kube-addon-manager.log 2>&1
    resources:
      requests:
        cpu: 5m
        memory: 50Mi
    volumeMounts:
    - mountPath: /etc/kubernetes/
      name: addons
      readOnly: true
    - mountPath: /var/log
      name: varlog
      readOnly: false
  volumes:
  - hostPath:
      path: /etc/kubernetes/
    name: addons
  - hostPath:
      path: /var/log
    name: varlog
```

## 参考

* [Addon-manager](https://github.com/kubernetes/kubernetes/tree/release-1.8/cluster/addons/addon-manager)
