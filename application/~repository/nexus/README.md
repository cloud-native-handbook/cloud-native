# Sonatype nexus


## 仓库类型

* hosted: 本地仓库，通常我们会部署自己的构件到这一类型的仓库。比如公司的第二方库。
* proxy: 代理仓库，它们被用来代理远程的公共仓库，如maven中央仓库。
* group: 仓库组，用来合并多个hosted/proxy仓库，当你的项目希望在多个repository使用资源时就不需要多次引用了，只需要引用一个group即可。


## 账号/密码

默认管理员账号/密码：`admin`/`admin123`。



## 搭建私服


## 使用私服

### Maven(pom.xml)



* 全局设置

Idea 的 Maven 全局设置路径：

  - ./Tools/idea/plugins/maven/lib/maven2/conf/settings.xml
  - ./Tools/idea/plugins/maven/lib/maven3/conf/settings.xml

  * <IDEA-PATH>/plugins/maven/lib/maven3/conf/settings.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
  <settings>
    ...
    <mirrors>
      <mirror>
        <!--This sends everything else to /public -->
        <id>nexus</id>
        <mirrorOf>*</mirrorOf>
        <!-- <url>http://repo1.maven.org/maven2/</url> -->
        <url>http://127.0.0.1:8081/nexus/content/groups/public</url>
      </mirror>
    </mirrors>
    <profiles>
      <profile>
        <id>jdk-1.4</id>

        <activation>
          <jdk>1.4</jdk>
        </activation>

        <repositories>
          <repository>
            <id>central</id>
            <name>Central Repository</name>
            <url>http://repo.maven.apache.org/maven2</url>
            <layout>default</layout>
            <snapshotPolicy>always</snapshotPolicy>
            <snapshots>
              <enabled>false</enabled>  
            </snapshots>
          </repository>
        </repositories>        
      </profile>
    </profiles>
    ...
  </settings>
</xml>
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings>
  <mirrors>
    <mirror>
        <!--This sends everything else to /public -->
        <id>nexus</id>
        <mirrorOf>*</mirrorOf>
        <!-- <url>http://repo1.maven.org/maven2/</url> -->
        <url>http://127.0.0.1:8081/nexus/content/groups/public</url>
    </mirror>
  </mirrors>
  <profiles>
      <profile>
          <id>nexus</id>
          <!--Enable snapshots for the built in central repo to direct -->
          <!--all requests to nexus via the mirror -->
          <repositories>
              <repository>
                  <id>central</id>
                  <url>http://repo1.maven.org/maven2/</url>
                  <releases>
                      <enabled>true</enabled>
                  </releases>
                  <snapshots>
                      <enabled>true</enabled>
                  </snapshots>
              </repository>
          </repositories>
          <pluginRepositories>
              <pluginRepository>
                  <id>central</id>
                  <url>http://central</url>
                  <releases>
                      <enabled>true</enabled>
                  </releases>
                  <snapshots>
                      <enabled>true</enabled>
                  </snapshots>
              </pluginRepository>
          </pluginRepositories>
      </profile>
  </profiles>
  <activeProfiles>
      <!--make the profile active all the time -->
      <activeProfile>nexus</activeProfile>
  </activeProfiles>
</settings>
```
```

* 项目设置

pom.xml

```xml
<project>
  ...
  <repositories>
    <repository>
      <id>nexus</id>
      <name>nexus</name>
      <!-- 仓库地址点击页面的 copy 按钮获取 -->
      <url>http://127.0.0.1:8081/repository/maven-public/</url>
      <!-- Release 版本则代表稳定的版本 -->
      <releases>
        <enabled>true</enabled>
      </releases>
      <!-- Snapshot 版本代表不稳定、尚处于开发中的版本，默认关闭，需要手动启动 -->
      <snapshots>
        <enabled>true</enabled>
      </snapshots>
    </repository>
  </repositories>
  ...
</projects>
```

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



### SBT(sbt.build)

* Gradle(build.gradle)

```
repositories {
    maven {
        url 'http://172.18.2.40:8081/repository/maven-public/'
    }
    jcenter()
}
```





https://github.com/kubernetes/charts/tree/master/stable/sonatype-nexus
