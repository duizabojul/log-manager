# Log-Manager

Scalable microservices to handle logs of multiples applications and consolidate them in S3 Storage. Built with `docker` and `node.js`.

### Prerequisites


You have to install `node`, `docker` and `docker-compose` to install and test the application


### Installing and deploying

To install and deploy stack follow these steps :


1. Init a swarm :

`docker swarm init` 

2. Deploy stack

`npm run stack:deploy` or `docker stack deploy --compose-file=docker-compose.yml log-manager`


### Testing 

- Access ingestor microservice via `http://localhost:80/`. Requests will be load-balanced via HAProxy with Round-robin strategy.

- Access consolidator via `http://localhost:3333/`.


### Good to know

You can scale ingestor microservice during runtime with following command : `docker service scale log-manager_ingestor=NB_CONTAINERS`

You can update microservices during runtime with following commands : `npm run update:consolidator` and `npm run update:ingestor`

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


