# MSPSentry-FOSS

## Integrate Sentinel One with ConnectWise Manage.

## Requirements
- Docker
- Node.js if you don't want to use a container (Not recommended)
- Some other container runtime if you want to adapt to it

## _This has never been tested in Windows. Though, containers shouldn't care at all. I've always run them in Docker on GNU/Linux or Kubernetes. If you encounter some platform-related problem running this container in Windows, I won't have much up-front knowledge aside from, "Run it in a better host."_

## 3rd Party Dependencies

- [connectwise-rest](https://github.com/covenanttechnologysolutions/connectwise-rest)
- [dotenv](https://github.com/motdotla/dotenv#readme)

I've created the Sentinel One and Logging libraries herein from scratch using native Node.Js components. There are no 3rd party web request libraries used for accessing the Sentinel One API. Connectwise-Rest uses the Axios request library.

## Summary

Sentinel One incidents that don't require action are created with the default priority. Incidents that are unmitigated and unresolved are created with a high priority in ConnectWise Manage.

It will only check back to the beginning of the current month. If you have incidents dating back to before the start of the current month, MSP Sentry will not create tickets for them.

MSP Sentry updates the incidents in Sentinel One with the Ticket ID for every ticket made in ConnectWise Manage for that incident. If an incident has a ticket ID attached to it in Sentinel One, MSP Sentry will ignore it.

The hosted MSP Sentry service acted as a closed-loop service and closed/completed tickets in ConnectWise Manage once the corresponding incidents were resolved in Sentinel One. This does not do that because there is no database functionality here. If you're comfortable with Node.Js and MongoDb (or whatever you choose), then it shouldn't be much work to add that functionality. The functions for doing that are present and commented out in `./index.js`. If you're comfortable with this language, it won't be too difficult to make that work. Reach out if you need help with that bit.

## Usage

### Node.Js
If you want to run the Node.Js portion directly on your machine, you'll need to install Node 12.18.1+. If you're good with that then you probably know how to handle the rest.

### Docker

Clone this repository:

`git clone https://github.com/twilcomgistix/MSPSentry-FOSS.git`

Enter the cloned directory:

`cd MSPSentry-FOSS`

Have the following pieces of information handy:

- Sentinel One API Token
- Sentinel One FQDN Hostname (e.g. `usea-vendor.sentinelone.com`)
- ConnectWise Manage Public Key
- ConnectWise Manage Private Key
- [ConnectWise Client ID](https://developer.connectwise.com/ClientID)
- ConectWise Manage Hostname (e.g. `manage.domain.com`)
- ConectWise Company Id
- ConnectWise Catchall Company Id 
- The name of the board where tickets should go
- The status that tickets should have when created

### Logging

The container is configured to log actions and failures into a file in `/app/logs` so use a docker volume to mount a folder location on your host so you can read those logs:

`-v /var/logs/S1alerts:/app/logs`

### Build and Run

1. Build the image:

    `docker build -t mspsentry-foss:latest .`

1. Run the container:

    `docker run --rm --env cwCompanyId="Your-Company-Id" --env apiToken="Sentinel-One-Api-Key" --env  hostname="Sentinel-One-Hostname" --env wPubKey="CW-Public-Key" --env cwPrivKey="CW-Private-Key" --env  cwClientId="Your-CW-Client-ID" --env cwHostname="CW-Hostname" --env cwCompanyId="CW-Company-Name" --env cwCatchAllId="CW-Catchall-Company-Id" --env cwHighPriorityId="CW-High-Priority-Id" --env cwBoardName="CW-Board-Name" --env cwNewStatus="CW-New-Status-Name" --network="host" -v /mnt/logs/alerts:/app/logs --name SentinelOne mspsentry-foss:latest`

The above `docker run` command will spin up the container, inject your secrets as environment variables, then execute the code which will create tickets in ConnectWise Manage for incidents. When it's done, it will destroy the container leaving no trace except for the log entries.

You can optionally fill in your secrets in `env.txt` before you build the container image so they're hard-coded inside there. Your Sentinel One API Token will expire in 6 months so you'll have to replace that and rebuild the container. If you want to do that, you'll need to delete `.env` from the `.dockerignore` and rename `env.txt` to `.env` file before you build.

There is a function in the Sentinel One package that can be used to generate a new API token named `getToken`.
Call it like this: 
```javascript
sentinelOne.getToken(process.env.apiToken).then(d => {
    results = JSON.parse(d);
    // This assumes you have some kind of encryption function to encrypt the token before storing it.
    var encryptedToken = encrypt(`${results.data.token}`);
    // This assumes you have a database function of some kind to store the token
    db.storeAPIKey(encryptedToken).catch(e=>{console.error(e);});
}).catch(e => {
    console.error(e);
});
```
If you know what you're doing with Node.Js, then this should be straightforward. If not, set the token in the `--env` argument on your Docker run command and be sure to update it once every 6 months.

I have not included any of the database or secrets encryption source code used by the [MSP Sentry](https://mspsentry.com) hosted service in this repository.

You could use SQL or NoSQL or whatever you like to store that secret if you're motivated enough.
