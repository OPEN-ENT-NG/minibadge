# À propos de l'application Minibadge

* Licence : [AGPL v3](http://www.gnu.org/licenses/agpl.txt) - Copyright Région Hauts de France
* Propriétaire(s) : CGI
* Mainteneur(s) : CGI
* Financeur(s) : Région Hauts de France
* Description : Application d'assignation de badges entre les utilisateurs de l'OPEN ENT.

## Configuration du module minibadge dans le projet OPEN ENT

Dans le fichier 'ent-core.json.template' du projet OPEN ENT :

<pre>
    {
      "name": "fr.cgi~minibadge~1.0-SNAPSHOT",
      "config": {
        "main" : "fr.cgi.minibadge.Minibadge",
        "port" : 8131,
        "app-name" : "MiniBadge",
    	"app-address" : "/minibadge",
    	"app-icon" : "${host}/minibadge/public/img/uni-minibadge.svg",
        "host": "${host}",
        "ssl" : $ssl,
        "sql": true,
        "db-schema": "minibadge",
        "auto-redeploy": false,
        "userbook-host": "${host}",
        "integration-mode" : "HTTP",
        "app-registry.port" : 8012,
        "mode" : "${mode}",
        "entcore.port" : 8009
      }
    }
</pre>


## Documentation
Minibadge est un outil permettant aux utilisateurs de s'assigner des badges entre eux.
Il contient des badges descendant d'un type, chaque badge étant associés à un utilisateur. 
Chaque utilisateur (excepté le propriétaire du badge) peut donc ajouter une assignation sur un badge. 

# Modèle de données - base PostgreSQL
les tables :
* badge: Elément decernable à un utilisateur.
* badge_assigned: Assignation par un utilisateur, rattaché à un badge.
* badge_assigned_structure: Permet de stocker les structures concernées par assignation (pour les statistique, notamment).
* badge_type: Type définissant les caractéristiques des badges leur étant associés 
* user: Utilisateurs possédants des badges, facilite la pagination pour certaines listes.
* badge_assigned: Décernement d'un utilisateur sur le badge d'un autre utilisateur.
* scripts: Enregistre les scripts joués au lancement du module.

_Il existe d'autres tables pour le moment non utilisés. Elles existent en prévision des prochaines évolutions. 
Elle seront renseignez ici lorsqu'elle seront utilisés._ 

Exemple d'une occurrence de "badge_type" :

<pre>
{
    id : 1
    slug : "ANIMATION"
    picture_id : "animation.svg"
    label: "Animation"
    description: "Tu aimes gérer l’animation d’un groupe, tu fais ce qu’il faut pour que chacun participe et se sente 
intégré aux activités."
    updated_at: 2022-10-27 11:25:13.976014
    created_at: 2022-10-27 11:25:13.976014
}
</pre>


Description des champs de "badge_type" :

<pre>
{
    id: Identifiant du type de badge.
    slug: Identifiant textuel du type de badge.
    picture_id: Identifiant de l'image associée au type de badge.
    label: Nommage du type de badge.
    description: Déscription du type de badge.
    updated_at: Date de mise à jour du type de badge.
    created_at: Date de création du type de badge.

</pre>

Exemple d'une occurrence de "badge" :

<pre>
{
    id: 34
    owner_id: "e4a3f6c1-b0ea-42dc-a685-cb38192ca7ce"
    badge_type_id: 10
    privatized_at:  
    disabled_at:  
    updated_at: 2023-01-02 11:46:41.092709
    created_at: 2022-11-28 19:49:11.428883
    refused_at: 2023-01-02 11:46:41.092709
}
</pre>

Description des champs de "badge" :

<pre>
{
    id: Identifiant du badge.
    owner_id: Identifiant du propriétaire du badge (user).
    badge_type_id: Identifiant du type de badge associé.
    privatized_at: Date de privatisation du badge. Si ce champ est renseigné, il ne sera plus affiché dans 
les informations accessibles aux autres utilisateurs.  
    disabled_at: Date de désactivation du module pour l'utilisateur possesseur de ce badge. Si ce champ est renseigné, 
Le badge n'est plus assignable et n'est plus affiché dans les informations accessibles aux autres utilisateurs.
    updated_at: Date de mise à jour du badge.
    created_at: Date de création du badge.
    refused_at: Date de refus du badge. Si ce champ est renseigné, Le badge n'est plus assignable et n'est plus affiché 
dans les informations accessibles aux autres utilisateurs.
}
</pre>

Exemple d'une occurrence de "badge_assigned" :

<pre>
{
    id: 30
    badge_id: 31
    assignor_id: "2ea1c269-bdb8-4705-a596-9a2b87005202"
    revoked_at:  
    updated_at: 2022-11-21 19:11:01.103555
    created_at: 2022-11-21 19:11:01.103555
}
</pre>

Description des champs de "badge_assigned" :

<pre>
{
    id: Identifiant de l'assignation.
    badge_id: Identifiant du badge.
    assignor_id: Identifiant de l'utilisateur ayant créé l'assignation.
    revoked_at: Date de révocation de l'assignation. Si ce champ est renseigné, l'assignation n'est plus visible 
sur le badge associé. L'assignateur peut recréer une assignation pour ce badge.
    updated_at: Date de mise à jour du badge.
    created_at: Date de création du badge.
}
</pre>

# Gestion des droits
* minibadge.assign: Droit d'assigner un badge.
* minibadge.receive: Droit de recevoir un badge.
* minibadge.view: Droit de voir le module et de naviguer dessus.

# Charte du module: les préférences utilisateurs
Grâce à la charte du module, les utilisateurs vont pouvoir accepter ou non d'utiliser le module.
L'utilisateur doit dans un premier temps accepter la charte. Lui est ensuite possible de choisir s'il:
* Accepte d'utiliser le module et ainsi de pouvoir user de tous ses droits actuels 
("minibadge.view" + "minibadge.assign" et/ou "minibadge.receive").
* Refuse d'utiliser le module, auquel cas il ne peut user que du droit "minibadge.view".
