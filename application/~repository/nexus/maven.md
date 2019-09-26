# Maven

## 部署

* 命名空间

```bash
$ kubectl create namespace sonatype-nexus
```

* PVC

创建 Ceph RBD 所需的 Secret：

```bash
$ cat <<EOF | kubectl -n sonatype-nexus apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF
```

创建 PVC：

```bash
# 假设你已经部署好了 "rbd" StorageClass
$ cat <<EOF | kubectl -n sonatype-nexus apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nexus-pvc
spec:
  storageClassName: rbd
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
EOF
```

验证：

```bash
$ kubectl get pvc -n sonatype-nexus
NAME        STATUS    VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
nexus-pvc   Bound     pvc-708f6573-30ce-11e8-8d5d-d4bed9ee2059   10Gi       RWO            rbd            49s
```

* Deployment

需要注意的是 `sonatype/nexus3` 默认是使用 `nexus` 用户来运行的，[Dockerfile](https://github.com/sonatype/docker-nexus3/blob/master/Dockerfile#L65)。

```bash
$ cat <<EOF | kubectl -n sonatype-nexus apply -f -
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: nexus
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      k8s-app: nexus
  template:
    metadata:
      labels:
        k8s-app: nexus
    spec:
      securityContext:
        runAsUser: 200
        fsGroup: 200
      containers:
      - name: nexus
        image: sonatype/nexus3
        imagePullPolicy: IfNotPresent
        ports:
        - name: web
          containerPort: 8081
        volumeMounts:
        - name: nexus-data
          mountPath: /nexus-data
      volumes:
      - name: nexus-data
        persistentVolumeClaim:
          claimName: nexus-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: nexus
spec:
  type: ClusterIP
  selector:
    k8s-app: nexus
  ports:
  - name: web
    port: 8081
    targetPort: web
EOF
```

检查：

```bash
$ kubectl -n sonatype-nexus get pod,ep
NAME                        READY     STATUS    RESTARTS   AGE
po/nexus-7586bd7574-m9pqk   1/1       Running   0          1m

NAME       ENDPOINTS           AGE
ep/nexus   172.1.74.146:8081   15m
```

* Ingress

```bash
$ cat <<EOF | kubectl -n sonatype-nexus apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: nexus
  annotations:
    ingress.kubernetes.io/proxy-body-size: "0"
    kubernetes.io/ingress.class: "nginx"
spec:
  #tls:
  #- hosts:
  #  - nexus.cloud.local
  #  secretName: nexus-secret
  rules:
  - host: nexus.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: nexus
          servicePort: 8081
EOF
```

> https://blog.sonatype.com/kubernetes-recipe-sonatype-nexus-3-as-a-private-docker-registry


## Maven

### 本地仓库

本地仓库路径（M2_HOME）：`~/.m2/repository`

```xml
<xml>
  ...
  <settings>
    <!-- 本地的仓库路径，默认: ~/.m2/repository -->
    <localRepository>~/.m2/repository</localRepository>
    ......
  </settings>
  ...
</xml>
```

### 远程仓库

maven的远程仓库有多种存在形式，中央仓库，其他远程仓库，镜像，私服。

* 常用仓库

> https://repo.maven.apache.org/maven2/
> https://repo1.maven.org/maven2/
> http://central.maven.org/maven2/
> https://repository.sonatype.org
> https://repository.jboss.org/

* 中央仓库

中央仓库是默认的远程仓库，仓库地址为 `https://repo.maven.apache.org/maven2`。配置如下：

```xml
<?xml version="1.0" encoding="UTF-8"?>
  <settings>
    ......
    <repositories>
      <repository>
        <id>central</id>
        <name>Central Repository</name>
        <url>http://repo.maven.apache.org/maven2</url>
        <layout>default</layout>
        <snapshots>
        <enabled>false</enabled>
        </snapshots>
      </repository>
    </repositories>
    ......
  </settings>
</xml>
```

* Mirror

`Mirror` 负责将指定仓库的依赖请求转发至相应服务器。下面的配置，将仓库 id 为 `repositoryId` 的所有依赖请求转发至 `http://my.repository.com/repo/path` 远程仓库。

```xml
<?xml version="1.0" encoding="UTF-8"?>
  <settings>
    ......
    <mirrors>
      <mirror>
        <id>mirrorId</id>
        <mirrorOf>repositoryId</mirrorOf>
        <name>Human Readable Name for this Mirror.</name>
        <url>http://my.repository.com/repo/path</url>
      </mirror>
      ...
    </mirrors>
    ......
  </settings>
</xml>
```

更为常用的作法是将所有仓库的请求转发到私服，配置如下：

```xml
<?xml version="1.0" encoding="UTF-8"?>
  <settings>
    ......
    <mirror>
      <id>mirrorId</id>
      <mirrorOf>*</mirrorOf>
      <name>Human Readable Name for this Mirror.</name>
      <url>http://my.repository.com/repo/path</url>
    </mirror>
    ......
  </settings>
</xml>
```


## 远程仓库的验证

`<server>` 的 `id` 需要远程仓库（`<repository>`）的 `id` 对应起来。

```xml
<xml>
  <settings>
    ...
    <servers>
      <server>
        <id>deploymentRepo</id>
        <username>repouser</username>
        <password>repopwd</password>
      </server>
      ......
    </servers>
    ...
  </settings>
</xml>
```

### 项目依赖

```xml
<project>
  ...
  <dependencies>
    <dependency>
      <groupId>xom</groupId>
      <artifactId>xom</artifactId>
      <version>1.2</version>
    </dependency>
    ......
  </dependencies>
  ...
</project>
```


## SBT

## Gradle

Gradle


## 如何部署到远程 Nexus

在项目文件 `pom.xml` 中添加。其中 `id` 为 settings.xml 文件中 server 所对应的 id，一般为默认，无需修改。

```xml
<project>
  ...
  <distributionManagement>
    <repository>
      <id>releases</id>
      <name>Nexus Release Repository</name>
      <url>http://ip:8081/nexus/content/repositories/releases/</url>
    </repository>
    <snapshotRepository>
      <id>snapshots</id>
      <name>Nexus Snapshot Repository</name>
      <url>http://ip:8081/nexus/content/repositories/snapshots/</url>
    </snapshotRepository>
  </distributionManagement>
  ...
</project
```

* 部署

```bash
$ mvn clean
$ mvn deploy
```

* 编译

```bash
$ mvn clean
$ mvn install -D maven.test.skip=true
```



## 参考

* [配置 maven 私服 nexus](https://blog.csdn.net/xlgen157387/article/details/51901412)
