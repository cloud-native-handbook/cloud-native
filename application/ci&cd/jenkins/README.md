# Jenkins


## Jenkins Slave 与 Jenkins Server 的连接方式

* ssh 连接
* jnlp 连接

Kubernetes plugin 插件用的是 jnlp 方式。这种方式是通过运行slave.jar，指定Jenkins Server的url参数和secret token参数，来建立连接。

```bash
$ java $JAVA_OPTS $JNLP_PROTOCOL_OPTS -cp /usr/share/jenkins/slave.jar hudson.remoting.jnlp.Main -headless $TUNNEL $URL $WORKDIR $OPT_JENKINS_SECRET $OPT_JENKINS_AGENT_NAME "$@"
```


## 部署 Jenkins Server

> https://yq.aliyun.com/articles/180888
> http://www.cnblogs.com/iiiiher/p/8110025.html



## 关闭重启

* 关闭

> http://jenkins.example.com/exit

* 重启

> http://jenkins.example.com/restart

* 重新加载配置信息

> http://jenkins.example.com/reload




## 广东-毛台

```
[CI]jenkins安装&插件管理&java-helloworld之旅 http://www.cnblogs.com/iiiiher/p/7159309.html
[ci]jenkins-slave的添加(vm模式,通过ssh和jnlp) http://www.cnblogs.com/iiiiher/p/7930251.html
[ci]jenkins-slave-ssh docker容器化-自动注入key http://www.cnblogs.com/iiiiher/p/7978552.html
[ci]jenkins-slave-ssh docker容器化-用户名密码 http://www.cnblogs.com/iiiiher/p/7978212.html
[ci]jenkins server启动,通过jnlp的方式启动slave(容器模式) http://www.cnblogs.com/iiiiher/p/7978831.html
[svc]tomcat配置文件详解-最简单的基于mvn的war包 http://www.cnblogs.com/iiiiher/p/7943097.html
[ci]jenkins构建容器项目java-helloworld-非docker plugin模式,脚本实现参数化构建 http://www.cnblogs.com/iiiiher/p/7943718.html
[ci] jenkins kubernetes插件配置(容器模式)-通过jnlp http://www.cnblogs.com/iiiiher/p/7979336.html
[ci][k8s]jenkins配合kubernetes插件实现k8s集群构建的持续集成 http://www.cnblogs.com/iiiiher/p/8026555.html
[ci]容器ci索引 http://www.cnblogs.com/iiiiher/p/8026689.html 
```


## pipeline


```
node {
   stage('Fetch') { // for display purposes
      git credentialsId: '29e8b32c-7581-4fd9-a299-6bf63339cd6f',url: 'http://10.211.55.47:32001/root/java-jenkins.git'
      // Get the Maven tool.

   }
   stage('Review') {
        def sonarqubeScannerHome = tool name: '2.8', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
        withSonarQubeEnv {
          sh "${sonarqubeScannerHome}/bin/sonar-scanner '-Dsonar.projectName=$JOB_NAME' -Dsonar.projectVersion=$BUILD_NUMBER -Dsonar.projectKey=$JOB_NAME -Dsonar.sources=src"
        }
   }
   stage('Build') {
       withMaven(jdk: 'bundled', maven: 'bundled') {
         sh "mvn package"
       }
   }

   stage('Deploy') {
      docker.withRegistry('https://10.211.55.46:5000/') {
        withDockerServer([uri: 'tcp://10.211.55.46:4243']) {
            def img = docker.build "$JOB_NAME:$BUILD_NUMBER","support/docker"
            img.push()
        }

      }

    }
   stage('Test') {
        sh 'robot support/test/testhelloworld.robot'
   }
}
```


## 参考

* [Kubernetes 集群上基于 Jenkins 的 CI/CD 流程实践](https://yq.aliyun.com/articles/180888)
* [Jenkins 上 Kubernetes Plugin 的使用](http://blog.csdn.net/felix_yujing/article/details/78725142)
* [jenkinsci/kubernetes-plugin](https://github.com/jenkinsci/kubernetes-plugin)
* [Jenkins JNLP Agent Docker image](https://github.com/jenkinsci/docker-jnlp-slave)



https://jenkins.io/doc/book/pipeline/syntax/

https://www.jianshu.com/p/d07b442ac9aa
