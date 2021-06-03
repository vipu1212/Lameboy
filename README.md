![](https://img.shields.io/badge/OS-Linux%20%7C%20Mac-green)

# LameBoy (Beta)
![Lameboy](https://i.ibb.co/2KGbVHx/lame.png)

##### Lameboy is an *interactive* AWS Lambda function deployment CLI tool. Lameboy creates/updates functions with new version with every deployment.
 &nbsp;


 > **So very beta**   (╯°□°）╯︵ ┻━┻

 &nbsp;
## Installation

```sh
$ npm i lameboy --global
```

## Usage
To start lameboy, use the following command in terminal
```sh
$ lame
```
OR
```sh
$ lameboy
```

Lameboy  has  four  functionalities
   - Setup AWS Creds
   - Init Lambda folder
   - Deploy
   - Reset


#### Setup AWS Creds
***First time setup***. When you run lameboy for the first time, it is going to ask for
- AWS Access Key
- Secret Key
- Region
- [Default-Role-ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html)

#### Init Lambda folder
Before deployment, every lambda function folder needs to initialized. This creates a lame.json in the lambda folder. You can set custom values for every lambda by adding/replacing values here.

```json
{
    "Runtime": "nodejs8.10",
    "MemorySize": 128,
    "Handler": "index.handler",
    "Timeout": 10,
    "Publish": true,
    "Role": "arn:aws:iam::xxxxx:role/xxxxxx"
}
```

#### Deploy
Once intialized, you can deploy from the root folder where multiple lambda folders are it's subdirectories and you can select **multiple** lambdas to deploy OR provide direct path of lambda to deploy only **one**.

 &nbsp;
---
![Deploy](https://i.ibb.co/F7YSNRb/lame-deploy.png)

#### Reset
If you wan't to change your setup settings, you'll have reset.
```sh
$ lame --reset
```

### Knows Issues
 - Goes crazy on terminal resize. For now, do not resize the terminal once lameboy has been opened.
 - Upcoming issues

### TODO
 - Create Alias option on first deploy
 - Allow editing default init values globally
 - Fix resizing issue

###  License
 [MIT](https://docs.google.com/document/d/10n3vM5AxxCOSr2YkNWSSWKdzxEKtJ-rdijLQNGOwnZA/edit?usp=sharing)
