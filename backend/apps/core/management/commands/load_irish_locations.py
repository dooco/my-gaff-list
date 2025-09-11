"""
Django management command to load all Irish counties and their towns
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.db import transaction
from apps.core.models import County, Town


class Command(BaseCommand):
    help = 'Load all 26 counties of the Republic of Ireland and their major towns'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing counties and towns before loading',
        )

    def handle(self, *args, **options):
        self.stdout.write('Loading Irish counties and towns...')
        
        # Clear existing data if requested
        if options.get('clear'):
            self.stdout.write('Clearing existing data...')
            with transaction.atomic():
                Town.objects.all().delete()
                County.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing data cleared'))
        
        # Comprehensive data for all 26 counties and their major towns
        counties_data = {
            'Carlow': [
                'Carlow Town', 'Tullow', 'Bagenalstown', 'Hacketstown', 'Leighlinbridge',
                'Borris', 'Rathvilly', 'Ballon', 'Myshall', 'Palatine'
            ],
            'Cavan': [
                'Cavan Town', 'Virginia', 'Bailieborough', 'Kingscourt', 'Cootehill',
                'Belturbet', 'Ballyconnell', 'Ballyjamesduff', 'Mullagh', 'Kilnaleck',
                'Ballinagh', 'Butlersbridge', 'Crossdoney', 'Shercock'
            ],
            'Clare': [
                'Ennis', 'Shannon', 'Kilrush', 'Newmarket-on-Fergus', 'Sixmilebridge',
                'Scariff', 'Kilkee', 'Ennistymon', 'Lahinch', 'Lisdoonvarna',
                'Tulla', 'Crusheen', 'Corofin', 'Miltown Malbay', 'Killadysert',
                'Clarecastle', 'Bunratty', 'Quin', 'Spanish Point', 'Doolin'
            ],
            'Cork': [
                'Cork City', 'Ballincollig', 'Carrigaline', 'Cobh', 'Midleton',
                'Mallow', 'Fermoy', 'Youghal', 'Macroom', 'Bandon',
                'Kinsale', 'Clonakilty', 'Skibbereen', 'Bantry', 'Mitchelstown',
                'Passage West', 'Glanmire', 'Blarney', 'Tower', 'Rochestown',
                'Douglas', 'Crosshaven', 'Carrigtwohill', 'Glenville', 'Watergrasshill',
                'Little Island', 'Glounthaune', 'Castlemartyr', 'Whitegate', 'Aghada',
                'Ballycotton', 'Charleville', 'Kanturk', 'Buttevant', 'Dunmanway',
                'Castletownbere', 'Schull', 'Rosscarbery', 'Courtmacsherry', 'Ballineen'
            ],
            'Donegal': [
                'Letterkenny', 'Buncrana', 'Ballybofey', 'Donegal Town', 'Bundoran',
                'Carndonagh', 'Ballyshannon', 'Killybegs', 'Dunfanaghy', 'Moville',
                'Lifford', 'Stranorlar', 'Ardara', 'Glenties', 'Milford',
                'Ramelton', 'Rathmullan', 'Greencastle', 'Falcarragh', 'Dungloe',
                'Convoy', 'Raphoe', 'Ballyliffin', 'Malin', 'Kilmacrennan'
            ],
            'Dublin': [
                'Dublin City Centre', 'Dún Laoghaire', 'Swords', 'Tallaght', 'Blanchardstown',
                'Blackrock', 'Balbriggan', 'Malahide', 'Lucan', 'Clondalkin',
                'Ballsbridge', 'Ranelagh', 'Rathmines', 'Rathgar', 'Sandymount',
                'Donnybrook', 'Terenure', 'Templeogue', 'Rathfarnham', 'Dundrum',
                'Stillorgan', 'Foxrock', 'Dalkey', 'Killiney', 'Cabinteely',
                'Sandyford', 'Stepaside', 'Leopardstown', 'Ballinteer', 'Knocklyon',
                'Firhouse', 'Ballyboden', 'Churchtown', 'Goatstown', 'Clonskeagh',
                'Milltown', 'Harold\'s Cross', 'Portobello', 'Inchicore', 'Kilmainham',
                'Islandbridge', 'Chapelizod', 'Palmerstown', 'Ballyfermot', 'Cherry Orchard',
                'Crumlin', 'Drimnagh', 'Walkinstown', 'Perrystown', 'Kimmage',
                'Phibsboro', 'Drumcondra', 'Glasnevin', 'Cabra', 'Smithfield',
                'Stoneybatter', 'Grangegorman', 'Broadstone', 'Fairview', 'Marino',
                'Clontarf', 'Dollymount', 'Raheny', 'Kilbarrack', 'Howth',
                'Sutton', 'Baldoyle', 'Bayside', 'Donaghmede', 'Artane',
                'Coolock', 'Beaumont', 'Santry', 'Whitehall', 'Ballymun',
                'Finglas', 'Castleknock', 'Carpenterstown', 'Mulhuddart', 'Tyrrelstown',
                'Ongar', 'Clonsilla', 'Hartstown', 'Huntstown', 'Ashtown',
                'Phoenix Park', 'Adamstown', 'Saggart', 'Rathcoole', 'Newcastle',
                'Rush', 'Lusk', 'Skerries', 'Portmarnock', 'Kinsealy'
            ],
            'Galway': [
                'Galway City', 'Tuam', 'Ballinasloe', 'Loughrea', 'Athenry',
                'Oranmore', 'Gort', 'Clifden', 'Headford', 'Oughterard',
                'Moycullen', 'Bearna', 'Spiddal', 'Claregalway', 'Clarinbridge',
                'Kinvara', 'Portumna', 'Mountbellew', 'Glenamaddy', 'Williamstown',
                'Ballygar', 'Dunmore', 'Roundstone', 'Letterfrack', 'Leenane',
                'Carna', 'Carraroe', 'Inverin', 'Rossaveal', 'Kilcolgan'
            ],
            'Kerry': [
                'Tralee', 'Killarney', 'Listowel', 'Castleisland', 'Killorglin',
                'Kenmare', 'Dingle', 'Cahersiveen', 'Ballybunion', 'Castlegregory',
                'Ardfert', 'Fenit', 'Barraduff', 'Farranfore', 'Milltown',
                'Rathmore', 'Glenbeigh', 'Waterville', 'Sneem', 'Kilgarvan',
                'Beaufort', 'Firies', 'Ballyheigue', 'Tarbert', 'Moyvane',
                'Duagh', 'Abbeyfeale', 'Gneeveguilla', 'Ballymacelligott', 'Annascaul'
            ],
            'Kildare': [
                'Naas', 'Newbridge', 'Celbridge', 'Leixlip', 'Maynooth',
                'Kildare Town', 'Athy', 'Sallins', 'Clane', 'Kilcock',
                'Monasterevin', 'Rathangan', 'Prosperous', 'Johnstown', 'Kill',
                'Straffan', 'Carragh', 'Castledermot', 'Kilcullen', 'Ballymore Eustace',
                'Blessington', 'Allenwood', 'Robertstown', 'Coill Dubh', 'Derrinturn',
                'Carbury', 'Timahoe', 'Moone', 'Calverstown', 'Nurney'
            ],
            'Kilkenny': [
                'Kilkenny City', 'Callan', 'Thomastown', 'Castlecomer', 'Graiguenamanagh',
                'Mooncoin', 'Urlingford', 'Ballyragget', 'Freshford', 'Piltown',
                'Gowran', 'Paulstown', 'Goresbridge', 'Inistioge', 'Bennettsbridge',
                'Mullinavat', 'Stoneyford', 'Kells', 'Kilmacow', 'Ballyhale',
                'Knocktopher', 'Windgap', 'Johnstown', 'Fiddown', 'Slieverue'
            ],
            'Laois': [
                'Portlaoise', 'Portarlington', 'Mountmellick', 'Stradbally', 'Abbeyleix',
                'Mountrath', 'Rathdowney', 'Durrow', 'Ballybrittas', 'Ballinakill',
                'Clonaslee', 'Borris-in-Ossory', 'Ballyroan', 'Emo', 'Vicarstown',
                'Arles', 'Killeshin', 'Ballylinan', 'Timahoe', 'Castletown'
            ],
            'Leitrim': [
                'Carrick-on-Shannon', 'Manorhamilton', 'Ballinamore', 'Mohill', 'Drumshanbo',
                'Dromahair', 'Kinlough', 'Dromod', 'Leitrim Village', 'Kiltyclogher',
                'Tullaghan', 'Glenfarne', 'Drumkeeran', 'Ballinaglera', 'Keshcarrigan',
                'Rossinver', 'Fenagh', 'Cloone', 'Gortletteragh', 'Aughavas'
            ],
            'Limerick': [
                'Limerick City', 'Newcastle West', 'Annacotty', 'Castletroy', 'Raheen',
                'Dooradoyle', 'Castleconnell', 'Kilmallock', 'Abbeyfeale', 'Rathkeale',
                'Askeaton', 'Adare', 'Croom', 'Hospital', 'Bruff',
                'Patrickswell', 'Foynes', 'Cappamore', 'Pallasgreen', 'Murroe',
                'Caherconlish', 'Ballylanders', 'Glin', 'Doon', 'Oola',
                'Athea', 'Broadford', 'Kilfinane', 'Galbally', 'Ballyneety'
            ],
            'Longford': [
                'Longford Town', 'Edgeworthstown', 'Granard', 'Ballymahon', 'Lanesborough',
                'Drumlish', 'Ballinalee', 'Newtownforbes', 'Aughnacliffe', 'Keenagh',
                'Legan', 'Carrickboy', 'Clondra', 'Dromard', 'Killashee',
                'Ardagh', 'Ballinamuck', 'Colehill', 'Killoe', 'Newtown Cashel'
            ],
            'Louth': [
                'Dundalk', 'Drogheda', 'Ardee', 'Dunleer', 'Carlingford',
                'Castlebellingham', 'Blackrock', 'Termonfeckin', 'Clogherhead', 'Annagassan',
                'Tullyallen', 'Collon', 'Louth Village', 'Omeath', 'Greenore',
                'Baltray', 'Tallanstown', 'Knockbridge', 'Kilsaran', 'Gyles Quay'
            ],
            'Mayo': [
                'Castlebar', 'Ballina', 'Westport', 'Claremorris', 'Ballinrobe',
                'Swinford', 'Kiltimagh', 'Charlestown', 'Belmullet', 'Crossmolina',
                'Foxford', 'Ballyhaunis', 'Knock', 'Louisburgh', 'Newport',
                'Achill', 'Bangor Erris', 'Killala', 'Ballycastle', 'Keel',
                'Cong', 'Shrule', 'Balla', 'Tourmakeady', 'Partry'
            ],
            'Meath': [
                'Navan', 'Drogheda', 'Ashbourne', 'Laytown-Bettystown', 'Trim',
                'Dunboyne', 'Kells', 'Ratoath', 'Dunshaughlin', 'Enfield',
                'Stamullen', 'Duleek', 'Athboy', 'Oldcastle', 'Slane',
                'Summerhill', 'Ballivor', 'Nobber', 'Clonee', 'Gormanston',
                'Julianstown', 'Longwood', 'Moynalty', 'Kilmessan', 'Kentstown'
            ],
            'Monaghan': [
                'Monaghan Town', 'Carrickmacross', 'Castleblayney', 'Clones', 'Ballybay',
                'Glaslough', 'Emyvale', 'Inniskeen', 'Scotstown', 'Smithborough',
                'Threemilehouse', 'Newbliss', 'Rockcorry', 'Annyalla', 'Doohamlet',
                'Knockatallon', 'Ballinode', 'Drum', 'Shantonagh', 'Corduff'
            ],
            'Offaly': [
                'Tullamore', 'Birr', 'Edenderry', 'Clara', 'Banagher',
                'Ferbane', 'Portarlington', 'Kilcormac', 'Daingean', 'Shinrone',
                'Cloghan', 'Kinnitty', 'Shannonbridge', 'Rhode', 'Mucklagh',
                'Killeigh', 'Geashill', 'Clonbullogue', 'Walsh Island', 'Bracknagh'
            ],
            'Roscommon': [
                'Roscommon Town', 'Boyle', 'Castlerea', 'Ballaghaderreen', 'Strokestown',
                'Elphin', 'Ballyforan', 'Ballinlough', 'Castleplunket', 'Tulsk',
                'Ballintober', 'Frenchpark', 'Cootehall', 'Roosky', 'Tarmonbarry',
                'Knockcroghery', 'Athleague', 'Curraghboy', 'Ballyleague', 'Keadue'
            ],
            'Sligo': [
                'Sligo Town', 'Ballymote', 'Tubbercurry', 'Strandhill', 'Enniscrone',
                'Collooney', 'Ballisodare', 'Rosses Point', 'Grange', 'Easky',
                'Coolaney', 'Ballygawley', 'Mullaghmore', 'Cliffoney', 'Drumcliff',
                'Ransboro', 'Riverstown', 'Geevagh', 'Dromore West', 'Gurteen'
            ],
            'Tipperary': [
                'Clonmel', 'Thurles', 'Nenagh', 'Roscrea', 'Tipperary Town',
                'Cashel', 'Cahir', 'Templemore', 'Carrick-on-Suir', 'Newport',
                'Fethard', 'Killenaule', 'Littleton', 'Borrisoleigh', 'Borrisokane',
                'Ballina', 'Ardfinnan', 'Bansha', 'Holycross', 'Mullinahone',
                'New Inn', 'Cappawhite', 'Dundrum', 'Emly', 'Golden'
            ],
            'Waterford': [
                'Waterford City', 'Tramore', 'Dungarvan', 'Dunmore East', 'Lismore',
                'Cappoquin', 'Tallow', 'Ardmore', 'Passage East', 'Portlaw',
                'Kilmacthomas', 'Stradbally', 'Bunmahon', 'Lemybrien', 'Ballyduff',
                'Villierstown', 'Aglish', 'Clashmore', 'Ring', 'Cheekpoint'
            ],
            'Westmeath': [
                'Mullingar', 'Athlone', 'Moate', 'Kinnegad', 'Kilbeggan',
                'Castlepollard', 'Rochfortbridge', 'Delvin', 'Tyrellspass', 'Ballynacargy',
                'Collinstown', 'Fore', 'Milltownpass', 'Multyfarnham', 'Glassan',
                'Tang', 'Rathowen', 'Ballymore', 'Clonmellon', 'Ballinahown'
            ],
            'Wexford': [
                'Wexford Town', 'Enniscorthy', 'New Ross', 'Gorey', 'Bunclody',
                'Rosslare', 'Courtown', 'Ferns', 'Adamstown', 'Taghmon',
                'Castlebridge', 'Blackwater', 'Kilmore Quay', 'Fethard-on-Sea', 'Duncannon',
                'Campile', 'Wellingtonbridge', 'Clonroche', 'Ballycanew', 'Oilgate',
                'Piercestown', 'Murrintown', 'Barntown', 'Kilmuckridge', 'Ballaghkeen'
            ],
            'Wicklow': [
                'Bray', 'Arklow', 'Wicklow Town', 'Greystones', 'Blessington',
                'Baltinglass', 'Rathdrum', 'Aughrim', 'Carnew', 'Tinahely',
                'Newtownmountkennedy', 'Kilcoole', 'Enniskerry', 'Delgany', 'Kilpedder',
                'Rathnew', 'Ashford', 'Roundwood', 'Avoca', 'Shillelagh',
                'Dunlavin', 'Donard', 'Hollywood', 'Kilmacanogue', 'Newcastle'
            ]
        }
        
        created_counties = 0
        updated_counties = 0
        created_towns = 0
        updated_towns = 0
        
        with transaction.atomic():
            for county_name, towns in counties_data.items():
                # Create or update county
                county, county_created = County.objects.get_or_create(
                    name=county_name,
                    defaults={'slug': slugify(county_name)}
                )
                
                if county_created:
                    created_counties += 1
                    self.stdout.write(self.style.SUCCESS(f'Created county: {county_name}'))
                else:
                    updated_counties += 1
                    # Update slug if needed
                    if county.slug != slugify(county_name):
                        county.slug = slugify(county_name)
                        county.save()
                    self.stdout.write(f'County already exists: {county_name}')
                
                # Create or update towns
                for town_name in towns:
                    town_slug = slugify(f'{town_name}-{county_name}')
                    town, town_created = Town.objects.get_or_create(
                        name=town_name,
                        county=county,
                        defaults={'slug': town_slug}
                    )
                    
                    if town_created:
                        created_towns += 1
                        self.stdout.write(self.style.SUCCESS(f'  - Created town: {town_name}'))
                    else:
                        updated_towns += 1
                        # Update slug if needed
                        if town.slug != town_slug:
                            town.slug = town_slug
                            town.save()
        
        # Print summary
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Successfully processed all Irish locations!'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'Counties: {created_counties} created, {updated_counties} existing'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'Towns: {created_towns} created, {updated_towns} existing'
        ))
        
        # Print total counts
        total_counties = County.objects.count()
        total_towns = Town.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'\n📊 Total in database: {total_counties} counties and {total_towns} towns'
        ))
        
        # Show sample data for verification
        self.stdout.write('\n📍 Sample counties and their town counts:')
        for county in County.objects.all()[:5]:
            town_count = county.towns.count()
            self.stdout.write(f'  - {county.name}: {town_count} towns')