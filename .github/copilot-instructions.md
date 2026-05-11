Cette application est un site perso de pronostics pour la coupe du monde de football 2026.
Le but est de constituer une équipe de foot de 11 joueurs (3 attaquants, 3 milieux de terrain, 4 défenseurs et 1 gardien). 
En fonction des performances individuelles de chaque joueurs, on marque des points.
Chaque parieur mets en jeu une bouteille de vin d'une valeur de 10€. 
A la fin on réparti les bouteilles entre les 3 premiers joueurs en fonction du nombre de participants. 
Rappel des règles 
Votre équipe doit représenter : 
- au minimum 5 nationalités 
- au maximum 3 joueurs d'une même nationalité 

Votre équipe doit être composée : 
- 1 gardien 
-  4 défenseurs 
-  3 milieux de terrain 
-  3 attaquants 
Vous pourrez réaliser jusqu'à deux changements entre la phase de poule et la phase finale (en respectant les règles susmentionnées). 

Grille des points : 
Gardien n'encaisse pas de but : + 5 points 
Gardien encaisse un but : - 1 point / but 
Défense n'encaisse pas de but : + 2 points 
Défense encaisse un but : - 1 point / but 
Joueur marque un but : + 5 points / but 
Joueur présent tout le match : +2 points 
Joueur remplacé : +1 point 
Joueur entrant : +1 point 
Joueur carton jaune : -2 points 
Joueur carton rouge : -5 points

Tout le code doit être compatible mobile (responsible design)


Mon schéma de base de données est le suivant :

## Table `chat_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `author_name` | `text` |  |
| `content` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `countries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `code` | `text` | Primary |
| `name` | `text` |  |

## Table `entries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `team_id` | `uuid` |  |
| `wine_name` | `text` |  Nullable |
| `created_at` | `timestamp` |  Nullable |

## Table `matches`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `team_home` | `text` |  |
| `team_away` | `text` |  |
| `home_score` | `int4` |  Nullable |
| `away_score` | `int4` |  Nullable |
| `match_date` | `timestamp` |  Nullable |
| `stage` | `text` |  Nullable |

## Table `player_performances`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `player_id` | `uuid` |  |
| `match_id` | `uuid` |  |
| `goals` | `int4` |  Nullable |
| `played_full_match` | `bool` |  Nullable |
| `is_starter` | `bool` |  Nullable |
| `is_substitute_in` | `bool` |  Nullable |
| `yellow_cards` | `int4` |  Nullable |
| `red_cards` | `int4` |  Nullable |
| `goals_conceded` | `int4` |  Nullable |

## Table `players`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `country_code` | `text` |  |
| `position` | `text` |  |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `created_at` | `timestamp` |  Nullable |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `role` | `user_role` |  |

## Table `team_changes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `team_id` | `uuid` |  |
| `player_out_id` | `uuid` |  Nullable |
| `player_in_id` | `uuid` |  Nullable |
| `created_at` | `timestamp` |  Nullable |

## Table `team_players`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `team_id` | `uuid` |  |
| `player_id` | `uuid` |  |
| `position` | `text` |  |
| `is_active` | `bool` |  Nullable |

## Table `teams`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `name` | `text` |  |
| `total_points` | `int4` |  Nullable |
| `created_at` | `timestamp` |  Nullable |

