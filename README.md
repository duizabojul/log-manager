# Log-Manager

Scalable microservices to handle logs of multiples applications and consolidate them in S3 Storage. Built with `docker` and `node.js`.

### Prerequisites


You have to install `node`, `docker` and `docker-compose` to install and test the application


### Installing and deploying

#####To install and deploy stack follow these steps :

1. Create docker images of the two microservices :

`npm run install` or `cd ingestor && docker build -t duizabojul/ingestor . && cd ../consolidator && docker build -t duizabojul/consolidator . && cd ..`
 

2. Init a swarm :

`docker swarm init` 

3. Deploy stack

`npm run deploy-stack` or `docker stack deploy --compose-file=docker-compose.yml log-manager`


### Testing 

- Access ingestor microservice via `http://localhost:80/`. Requests will be load-balanced via HAProxy with Round-robin strategy.

- Access consolidator via `http://localhost:3333/`.



