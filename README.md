# Log-Manager

Scalable microservices to handle logs of multiples applications and consolidate them in S3 Storage. Built with `docker`, `node.js` and `minio`.

### Prerequisites


You have to install `node`, `docker` and `docker-compose` to install and test the application


### Installing and deploying

To install and deploy stack follow these steps :


1. Init a swarm :

`docker swarm init` 

2. Deploy stack

`npm run stack:start`


### Testing 

`npm run stack:start` &rarr; Deploy stack

`npm run stack:restart` &rarr; Restart all services except log-network

`npm run stack:stop` &rarr; Stop stack

`npm run logs-generator:start`  &rarr;  Flood ingestors with fake logs

`npm run logs-generator:stop` &rarr; Stop fake logs generator.

`npm run consolidator:start` &rarr; Start consolidator microservice : each ingestor will be requested every `NB_TOTAL_INGESTORS` seconds and will respond with logs added since the last request from consolidator. 

`npm run consolidator:stop` &rarr; Stop consolidator microservice.

`npm run consolidator:minioTask` &rarr; Launch minio task : verify if logs stored in consolidator file system are old enough to be send on minio and upload them after sorting and formatting.

`npm run test:start` &rarr; Start consolidator microservice and fake logs generator. 

`npm run test:stop` &rarr; Stop consolidator microservice and fake logs generator.


### Good to know

You can scale up and down ingestor microservice during runtime with following command : `docker service scale log-manager_ingestor=NB_CONTAINERS`

Because of the following `docker-compose.yml` configuration, the initial stack will deploy 6 containers of ingestor microservice (`replicas` value). 
If you update the ingestor during runtime, containers will be shutdowned and updated two by two (`parallelism` value), HAProxy will load-balance traffic on old version working containers and progressively redirect trafic on updated containers. In summary, you will not experience downtime of your ingestor microservice. 


```
ingestor:
  ...
  deploy:
    replicas: 6
    update_config:
      parallelism: 2
      delay: 10s
    restart_policy:
      condition: on-failure
      max_attempts: 3
      window: 120s
```

If you want to change this behavior, update the value of `replicas` and `parallelism`.   


