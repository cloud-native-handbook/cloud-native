# Pod 运维

## 查看所有 Pod

查看所有 Pod，包括异常终止和正常终止的 Pod：

```bash
$ kubectl get pod --show-all
```

## 查看资源使用情况（需要先部署 Heapster）

```bash
$ kubectl top pod kafka-0
NAME      CPU(cores)   MEMORY(bytes)
kafka-1   172m         558Mi
```

## 删除僵尸 Pod

```bash
$ kubectl delete pod <pod-name> --grace-period=0 --force
```

## 代理 Pod

```bash
$ kubectl port-forward $POD 9090:9090
```

## 解析 Pod

```bash
$ kubectl -n monitoring get pod grafana-578ff7fb7c-jhnjh -o yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubernetes.io/created-by: |
      {"kind":"SerializedReference","apiVersion":"v1","reference":{"kind":"ReplicaSet","namespace":"monitoring","name":"grafana-578ff7fb7c","uid":"bbd699f7-dfd0-11e7-bd1e-d4bed9ee30df","apiVersion":"extensions","resourceVersion":"858971"}}
  creationTimestamp: 2018-02-14T01:37:28Z
  generateName: grafana-578ff7fb7c-
  labels:
    k8s-app: grafana
    pod-template-hash: "1349939637"
    task: monitoring
  name: grafana-578ff7fb7c-jhnjh
  namespace: monitoring
  ownerReferences:
  - apiVersion: extensions/v1beta1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: grafana-578ff7fb7c
    uid: bbd699f7-dfd0-11e7-bd1e-d4bed9ee30df
  resourceVersion: "14539016"
  selfLink: /api/v1/namespaces/monitoring/pods/grafana-578ff7fb7c-jhnjh
  uid: 9dad10da-1127-11e8-bb18-d4bed9ee30df
spec:
  containers:
  - env:
    - name: INFLUXDB_HOST
      value: influxdb
    - name: INFLUXDB_PORT
      value: "8086"
    - name: GF_SERVER_HTTP_PORT
      value: "3000"
    - name: GF_AUTH_BASIC_ENABLED
      value: "false"
    - name: GF_AUTH_ANONYMOUS_ENABLED
      value: "true"
    - name: GF_AUTH_ANONYMOUS_ORG_ROLE
      value: Admin
    - name: GF_SERVER_ROOT_URL
      value: /
    image: dockerce/heapster-grafana-amd64:v4.4.3
    imagePullPolicy: IfNotPresent
    name: grafana
    ports:
    - containerPort: 3000
      protocol: TCP
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /etc/ssl/certs
      name: ca-certificates
      readOnly: true
    - mountPath: /var
      name: grafana-storage
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: default-token-fns6g
      readOnly: true
  dnsPolicy: ClusterFirst
  nodeName: kube-node-100
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.alpha.kubernetes.io/notReady
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.alpha.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - hostPath:
      path: /etc/ssl/certs
      type: ""
    name: ca-certificates
  - emptyDir: {}
    name: grafana-storage
  - name: default-token-fns6g
    secret:
      defaultMode: 420
      secretName: default-token-fns6g
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: 2018-02-14T01:37:28Z
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: 2018-02-14T01:41:38Z
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: 2018-02-14T01:37:28Z
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://a59b23e4721c161fe4999d8c26ce0b7afd578d1d0428c566306ea4448c104e04
    image: dockerce/heapster-grafana-amd64:v4.4.3
    imageID: docker-pullable://dockerce/heapster-grafana-amd64@sha256:77841ae8c3b3495ba02e9e8a0801d3c56815b65aca658a81309d11793857f1ec
    lastState: {}
    name: grafana
    ready: true
    restartCount: 0
    state:
      running:
        startedAt: 2018-02-14T01:41:30Z
  hostIP: 192.168.10.100
  phase: Running
  podIP: 172.1.74.139
  qosClass: BestEffort
  startTime: 2018-02-14T01:37:28Z
```

分析：

  * Pod 被调度到了 192.168.10.100 主机上；
  * Pod 的 IP 为 172.1.74.139
  * Pod 的 uid 为 9c9980c0-1127-11e8-bb18-d4bed9ee30df；
  * Pod 中 grafana 容器的 Container ID 为 a59b23e4721c... （`docker ps` 命令只显示前 12 位）；

检验：

```bash
# 检查容器是否存在
$ docker ps -a | grep a59b23e4721c

# 查看容器相关信息
$ docker inspect a59b23e4721c

# 容器路径
$ ls /var/lib/docker/containers/a59b23e4721c161fe4999d8c26ce0b7afd578d1d0428c566306ea4448c104e04

# Pod 路径
$ ls /var/lib/kubelet/pods/9dad10da-1127-11e8-bb18-d4bed9ee30df
```
