# 部署 Jenkins Server

## 部署

* 创建命名空间

```bash
$ kubectl create namespace jenkins
```

* 创建 PVC

```bash
# 在该命名空间为 rbd 创建 secret
$ cat <<EOF | kubectl -n jenkins apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF
```

```bash
# 通过 "rbd" StorageClass 申请 5G 的 PV 存储资源
$ cat <<EOF | kubectl -n jenkins apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: jenkins-pvc
spec:
  storageClassName: rbd
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF
```

* RBAC

这里为 `jenkins` ServiceAccount 绑定的是 `cluster-admin` ClusterRole，即集群最高权限。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: jenkins
  namespace: jenkins
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: jenkins
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: jenkins
  namespace: jenkins
EOF
```

* Jenkins Server

需要注意的是，目前社区提供的 `jenkins/jenkins` 镜像（[Dockerfile](https://github.com/jenkinsci/docker/blob/master/Dockerfile#L5-L8)）改变了默认的用户和组，所以需要为 Pod 或容器配置 [SecurityContext](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)，否则会出现这个错误：https://github.com/jenkinsci/docker/issues/493。

```bash
$ cat <<EOF | kubectl -n jenkins apply -f -
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: jenkins
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: jenkins
  template:
    metadata:
      labels:
        k8s-app: jenkins
    spec:
      serviceAccount: jenkins
      securityContext:
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: jenkins
        image: jenkins/jenkins:alpine
        imagePullPolicy: IfNotPresent
        env:
        - name: JAVA_OPTS
          value: "-Duser.timezone=Asia/Shanghai -XX:+UnlockExperimentalVMOptions -XX:+UseCGroupMemoryLimitForHeap -XX:MaxRAMFraction=1 -Dhudson.slaves.NodeProvisioner.MARGIN=50 -Dhudson.slaves.NodeProvisioner.MARGIN0=0.85"
        ports:
        - name: web
          containerPort: 8080
          protocol: TCP
        - name: slave
          containerPort: 50000
          protocol: TCP
        livenessProbe:
          httpGet:
            port: 8080
            path: /
          httpGet:
            port: 50000
            path: /
          initialDelaySeconds: 20
          periodSeconds: 5
        readinessProbe:
          httpGet:
            port: 8080
            path: /
          httpGet:
            port: 50000
            path: /
          initialDelaySeconds: 20
          periodSeconds: 5
        volumeMounts:
        - name: jenkins-home
          mountPath: /var/jenkins_home
      volumes:
      - name: jenkins-home
        persistentVolumeClaim:
          claimName: jenkins-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: jenkins
spec:
  type: ClusterIP
  selector:
    k8s-app: jenkins
  ports:
  - name: web
    port: 80
    targetPort: web
  - name: slave
    port: 50000
    targetPort: slave
---
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: jenkins
spec:
  rules:
  - host: jenkins.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: jenkins
          servicePort: web
EOF
```

* 检查部署的服务

```bash
$ kubectl -n jenkins get pvc,svc,ep,pod
NAME              STATUS    VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pvc/jenkins-pvc   Bound     pvc-519435e7-2da6-11e8-8d5d-d4bed9ee2059   5Gi        RWO            rbd            39m

NAME          TYPE        CLUSTER-IP        EXTERNAL-IP   PORT(S)              AGE
svc/jenkins   ClusterIP   172.254.167.174   <none>        8080/TCP,50000/TCP   39m

NAME         ENDPOINTS                              AGE
ep/jenkins   172.1.74.169:8080,172.1.74.169:50000   4m

NAME                          READY     STATUS    RESTARTS   AGE
po/jenkins-5fb45d6ffc-4rr4w   1/1       Running   0          9m
```

* 获取管理员初始密码

```bash
$ kubectl -n jenkins exec -it jenkins-5fb45d6ffc-4rr4w cat /var/jenkins_home/secrets/initialAdminPassword
```

获取管理员初始密码后，登录 Jenkins，并选择 `Install suggested plugins` 安装推荐的插件。插件安装完成后，你需要安装提示创建第一个管理员用户。


## 配置 Kubernetes-jenkins-plugin 实现 dynamic slaves provision

* 安装 kubernetes-plugin

【系统管理】->【管理插件】->【可选插件】。或者访问 `http://jenkins.cloud.local/pluginManager/available`，搜索 `kubernetes`，勾选要安装的插件，然后点击【直接安装】。最后勾选【安装完成后重启Jenkins(空闲时)】，等待重启完成后kubernetes-plugin就安装完成了。


* 配置 jenkins kubernetes-plugin 插件

单击【系统管理】->【系统设置】->【云】->【新增一个云】

| key  | value |
| ---- | ----- |
| name | kubernetes |
| Disable https certificate check | true |
| kubernetes URL  | https://kubernetes.default.svc.cluster.local |
| JenkinsURL      | http://jenkins.jenkins.svc.cluster.local （需要注意命名空间、服务名以及服务端口） |
| Connect Timeout | 5  |
| Read Timeout    | 15 |

这样就配置好了 kubernetes-plugin, 可以实现动态 jenkins-slaves in pod.

* 自定义 Slave 节点（作为 Pod 中的一个容器）

【Images】->【Add Pod Template】->【Kubernetes Pod Template】

| key          | value         |
| ------------ | ------------- |
| Name         | jenkins-slave |
| Labels       | jenkins-slave |
| Containers[0]['Name']        | jnlp |
| Containers[0]['Docker image']| jenkins/jnlp-slave:alpine |
| Containers[0]['Working directory'] | /home/jenkins |
| Containers[0]['Command to run']    | （无）         |
| Containers[0][' Arguments to pass to the command'] | （无） |

（还没有测试通过）

```bash
$ kubectl -n jenkins get pod jenkins-slave-rwkgt-qkz0r -o yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: 2018-03-23T02:13:32Z
  deletionGracePeriodSeconds: 30
  deletionTimestamp: 2018-03-23T02:14:10Z
  labels:
    jenkins/mypod: "true"
  name: jenkins-slave-rwkgt-qkz0r
  namespace: jenkins
  resourceVersion: "38372444"
  selfLink: /api/v1/namespaces/jenkins/pods/jenkins-slave-rwkgt-qkz0r
  uid: c94e39f6-2e3f-11e8-adc9-d4bed9b697fe
spec:
  containers:
  - args:
    - 19d8dcfe6a05980be6691aeba737c5e57ce57dd27f64c420c281aed0be58b9b1
    - jenkins-slave-rwkgt-qkz0r
    env:
    - name: JENKINS_SECRET
      value: 19d8dcfe6a05980be6691aeba737c5e57ce57dd27f64c420c281aed0be58b9b1
    - name: JENKINS_NAME
      value: jenkins-slave-rwkgt-qkz0r
    - name: JENKINS_URL
      value: http://jenkins.jenkins.svc.cluster.local/
    - name: HOME
      value: /home/jenkins
    image: jenkins/jnlp-slave:alpine
    imagePullPolicy: IfNotPresent
    name: jnlp
    resources: {}
    securityContext:
      privileged: false
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /home/jenkins
      name: workspace-volume
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: default-token-mdgwh
      readOnly: true
    workingDir: /home/jenkins
  dnsPolicy: ClusterFirst
  nodeName: kube-node-100
  restartPolicy: Never
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
  - emptyDir: {}
    name: workspace-volume
  - name: default-token-mdgwh
    secret:
      defaultMode: 420
      secretName: default-token-mdgwh
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: 2018-03-23T02:13:33Z
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: 2018-03-23T02:13:42Z
    message: 'containers with unready status: [jnlp]'
    reason: ContainersNotReady
    status: "False"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: 2018-03-23T02:13:33Z
    status: "True"
    type: PodScheduled
  containerStatuses:
  - image: jenkins/jnlp-slave:alpine
    imageID: ""
    lastState: {}
    name: jnlp
    ready: false
    restartCount: 0
    state:
      waiting:
        reason: ContainerCreating
  hostIP: 192.168.10.100
  phase: Pending
  qosClass: BestEffort
  startTime: 2018-03-23T02:13:33Z
```





## Jenkins CI 示例

新建一个 Pipeline 任务：访问 `http://jenkins.cloud.local/view/all/newJob`，输入一个 Pipeline 名，并选择 `Pipeline` 后点击 `OK`，输入下面的 Pipeline scripts：

```
/* cloud 字段指定系统设置里配置的 Kubernetes 云的名字 */
podTemplate(label: 'mypod', cloud: 'kubernetes') {
  node('mypod') {
    stage('Run shell') {
      sh 'echo hello world'
      sh 'date'
    }
  }
}
```

保存后从首页进入该 Job，单击【立即构建】。


【注】Jenkins Slave 使用的默认镜像是 [jenkins/jnlp-slave:alpine](https://github.com/jenkinsci/docker-jnlp-slave)，实际使用中可能需要预装一些软件到镜像中，这需要自己重新构建 Jenkins slave 镜像。

最后单击开始构建，通过构建日志观察任务的执行情况，你会发现Jenkins Server会通过Kubernetes启动一个Pod作为jenkins slave执行构建Pipeline（jenkins slave 是 Pod 中的一个容器，构建的服务在另一个容器）。


## 自定义 slave 镜像

* pipeline 类型的方式

```
podTemplate(label: 'mypod-1', cloud: 'kubernetes', containers: [
    containerTemplate(
        name: 'jnlp', 
        image: 'my.example.com/library/centos7.4-ssh-docker-maven-jenkins-slave:2.19', 
        alwaysPullImage: true, 
        args: '${computer.jnlpmac} ${computer.name}'),

  ],
  volumes: [
    hostPathVolume(mountPath: '/var/run/docker.sock', hostPath: '/var/run/docker.sock'),
],) 
{
    node('mypod-1') {
        stage('Task-1') {
            stage('show release version') {
                sh 'cat /etc/redhat-release '
            }
        }
    }
}
```

说明： containerTemplate 的 name 属性必须叫 `jnlp`，才能用images指定的镜像替换默认的jenkinsci/jnlp-slave镜像。此外，还要args参数传递两个jenkins-slave运行需要的参数。

* 非pipeline类型的方式

如果不使用pipeline类型任务的话，要想使用kubernetes plugin的云构建任务，还需要回到【系统设置】-【云】-【Kubernetes】-【Add Pod Template】里面继续配置 
