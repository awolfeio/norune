#Installation


### Instructions

Assets build uses node 8.X and ruby - it helps to have a locked down environment to do that build 

#### To build assets
This will kick off v2 and v3 npm pull, bower install, and grunt build

    docker-compose -f .\docker-compose-build.yml up
    docker-compose -f .\docker-compose-build-aem.yml up

    For Mac users, use without the '.\'
    docker-compose -f docker-compose-build.yml up
    docker-compose -f docker-compose-build-aem.yml up
    
This will populate your local file system with the built artifacts


### To serve on local port 80

NGINX can serve to render the content from your local files 

    docker-compose up -d
    
    
### To interact manually with v2 / v3

This will allow you to run grunt, etc - within the *nix shell that has node, gem, etc
    
    docker-compose run builder

To exit out of the *nix shell
	Ctrl + D    
    
### for AEM folder

You are going to have to symlink that in - on a windows machine I do the following

    cd /v2.0
    mklink /j aem E:\apps\projects\acs\aem-6\cdn

For Mac
	docker run -it -v /Users/
   
The AEM build compiles nicely via maven, but you could also use the node shell to build that path as well
