# kube-state-metrics

kube-state-metrics 用于对 Kubernetes 集群资源对象进行监控，如 Deployment、Node、Pod 等

## 部署

### 下载、修改

```bash
$ KUBE_STATE_METRICS_PATH=https://raw.githubusercontent.com/kubernetes/kube-state-metrics/v1.1.0/kubernetes

wget -O role.yaml $KUBE_STATE_METRICS_PATH/kube-state-metrics-role.yaml
wget -O role-binding.yaml $KUBE_STATE_METRICS_PATH/kube-state-metrics-role-binding.yaml

wget -O service-account.yaml $KUBE_STATE_METRICS_PATH/kube-state-metrics-service-account.yaml
wget -O cluster-role.yaml $KUBE_STATE_METRICS_PATH/kube-state-metrics-cluster-role.yaml
wget -O cluster-role-binding.yaml $KUBE_STATE_METRICS_PATH/kube-state-metrics-cluster-role-binding.yaml

wget -O deployment.yaml $KUBE_STATE_METRICS_PATH/kube-state-metrics-deployment.yaml
wget -O service.yaml $KUBE_STATE_METRICS_PATH/kube-state-metrics-service.yaml

# 修改 apiVersion
sed -i "s|rbac.authorization.k8s.io/v1beta1|rbac.authorization.k8s.io/v1|g" *.yaml
# 还需要手动添加一个 selector 配置匹配 spec.template.metadata.labels
sed -i "s|extensions/v1beta1|apps/v1beta2|g" deployment.yaml

# 修改镜像源
sed -i "s|quay.io/coreos|dockerce|g" deployment.yaml
sed -i "s|gcr.io/google_containers|dockerce|g" deployment.yaml
```

### 部署、校验

```bash
$ kubectl apply -f *.yaml

# 校验
$ kubectl -n kube-system get svc kube-state-metrics
NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
kube-state-metrics   ClusterIP   10.254.91.189   <none>        8080/TCP   16m

# 校验
$ kubectl -n kube-system get deploy kube-state-metrics
NAME                 DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
kube-state-metrics   1         1         1            1           4m

# 校验
$ kubectl -n kube-system get pod | grep kube-state-metrics
kube-state-metrics-56b967bfbc-cdd4s        2/2       Running   0          4m

# 排错
$ kubectl -n kube-system logs -f kube-state-metrics-56b967bfbc-cdd4s -c kube-state-metrics
$ kubectl -n kube-system logs -f kube-state-metrics-56b967bfbc-cdd4s -c addon-resizer
```

监控指标：`curl http://10.254.91.189:8080/metrics`，
健康检查：`curl http://10.254.91.189:8080/healthz`。


### cluster-role.yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-state-metrics
rules:
- apiGroups: [""]
  resources:
  - nodes
  - pods
  - services
  - resourcequotas
  - replicationcontrollers
  - limitranges
  - persistentvolumeclaims
  - namespaces
  verbs: ["list", "watch"]
- apiGroups: ["extensions"]
  resources:
  - daemonsets
  - deployments
  - replicasets
  verbs: ["list", "watch"]
- apiGroups: ["apps"]
  resources:
  - statefulsets
  verbs: ["list", "watch"]
- apiGroups: ["batch"]
  resources:
  - cronjobs
  - jobs
  verbs: ["list", "watch"]
```

### cluster-role-binding.yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-state-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-state-metrics
subjects:
- kind: ServiceAccount
  name: kube-state-metrics
  namespace: kube-system
```

### role.yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: kube-system
  name: kube-state-metrics-resizer
rules:
- apiGroups: [""]
  resources:
  - pods
  verbs: ["get"]
- apiGroups: ["extensions"]
  resources:
  - deployments
  resourceNames: ["kube-state-metrics"]
  verbs: ["get", "update"]
```

### role-binding.yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: kube-state-metrics
  namespace: kube-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: kube-state-metrics-resizer
subjects:
- kind: ServiceAccount
  name: kube-state-metrics
  namespace: kube-system
```

### service-account.yaml

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-state-metrics
  namespace: kube-system
```

### deployment.yaml

```yaml
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: kube-state-metrics
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: kube-state-metrics
  template:
    metadata:
      labels:
        k8s-app: kube-state-metrics
    spec:
      serviceAccountName: kube-state-metrics
      containers:
      - name: kube-state-metrics
        image: quay.io/coreos/kube-state-metrics:v1.1.0
        ports:
        - name: http-metrics
          containerPort: 8080
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          timeoutSeconds: 5
        resources:
          requests:
            memory: 100Mi
            cpu: 100m
          limits:
            memory: 200Mi
            cpu: 200m
      - name: addon-resizer
        image: gcr.io/google_containers/addon-resizer:1.0
        resources:
          limits:
            cpu: 100m
            memory: 30Mi
          requests:
            cpu: 100m
            memory: 30Mi
        env:
          - name: MY_POD_NAME
            valueFrom:
              fieldRef:
                fieldPath: metadata.name
          - name: MY_POD_NAMESPACE
            valueFrom:
              fieldRef:
                fieldPath: metadata.namespace
        command:
          - /pod_nanny
          - --container=kube-state-metrics
          - --cpu=100m
          - --extra-cpu=1m
          - --memory=100Mi
          - --extra-memory=2Mi
          - --threshold=5
          - --deployment=kube-state-metrics
```

[Addon Resizer](https://github.com/kubernetes/autoscaler/tree/master/addon-resizer) 会根据 Kubernetes 集群中节点的数量动态修改 Deployment 的资源请求（resources.requests）。

### service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kube-state-metrics
  namespace: kube-system
  labels:
    k8s-app: kube-state-metrics
  annotations:
    prometheus.io/scrape: 'true'
spec:
  ports:
  - name: http-metrics
    port: 8080
    targetPort: http-metrics
    protocol: TCP
  selector:
    k8s-app: kube-state-metrics
```

## 参考

* [kubernetes/kube-state-metrics](https://github.com/kubernetes/kube-state-metrics)
* [autoscaler/addon-resizer](https://github.com/kubernetes/autoscaler/tree/master/addon-resizer)