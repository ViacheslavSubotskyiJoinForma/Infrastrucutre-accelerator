from elasticsearch import Elasticsearch, ElasticsearchException
import re
import sys
import time

elkhits = 9001
indexname = "backend"
fieldname = "message"
elkhost = "elasticsearch.ClientDomain.com"

patterns = [
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # email
    r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',  # IP
    r'\+\d{1,4}[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',  # Phone number
    r'date of birth: (\d{4}-\d{2}-\d{2})',  # Date of birth
    r'"firstName":"(\w+)"',  # First name
    r'"lastName":"(\w+)"',  # Last name
    r'"middleName":"(\w+)"',  # Middle name
    r'"dateOfBirth":"(\d{4}-\d{2}-\d{2})"',  # Date of birth alternative
    r'"postal_code":"(\d+)"',  # Postal code
    r'"line1":"([^"]+)"',  # Line 1
    r'"line2":"([^"]+)"',  # Line 2
    r'"city":"([^"]+)"',  # City
    r'"fullSsn":"(\d+)"',  # SSN
    r'"shortSsn":"(\d+)"',  # SSN
    r'"remote":"([^"]+)"',
    r'"code":"([^"]+)"',
    r'"client_secret":"([^"]+)"',
    r'"access_token":"([^"]+)"',
    r'"legal_name":"([^"]+)"',
    r'"ein":"([^"]+)"',
    r'"location":"([^"]+)"',
    r'"locations":"([^"]+)"',
    r'"first_name":"([^"]+)"',
    r'"middle_name":"([^"]+)"',
    r'"last_name":"([^"]+)"',
    r'"preferred_name":"([^"]+)"',
    r'"date_of_birth":"([^"]+)"',
    r'"dob":"([^"]+)"',
    r'"email":"([^"]+)"',
    r'"emails":"([^"]+)"',
    r'"email_address":"([^"]+)"',
    r'"primary_email":"([^"]+)"',
    r'"contact_email":"([^"]+)"',
    r'"user_contact_email":"([^"]+)"',
    r'"work_email":"([^"]+)"',
    r'"personal_email":"([^"]+)"',
    r'"phone":"([^"]+)"',
    r'"phone_number":"([^"]+)"',
    r'"phone_numbers":"([^"]+)"',
    r'"mobile_phone":"([^"]+)"',
    r'"primary_phone_number":"([^"]+)"',
    r'"work_phone":"([^"]+)"',
    r'"personal_phone":"([^"]+)"',
    r'"gender":"([^"]+)"',
    r'"dob":"([^"]+)"',
    r'"residence":"([^"]+)"',
    r'"ssn":"([^"]+)"',
    r'"short_ssn":"([^"]+)"',
    r'"full_ssn":"([^"]+)"',
    r'"identity_code":"([^"]+)"',
    r'"finch_code":"([^"]+)"',
    r'"token":"([^"]+)"',
    r'"device_tokens":"([^"]+)"',
    r'"password":"([^"]+)"',
    r'"previous_password":"([^"]+)"',
    r'"address":"([^"]+)"',
    r'"line_one":"([^"]+)"',
    r'"line_two":"([^"]+)"',
    r'"city":"([^"]+)"',
    r'"state":"([^"]+)"',
    r'"postal_code":"([^"]+)"',
    r'"country":"([^"]+)"',
]

from_position = 0

# Initialize Elasticsearch client
es = Elasticsearch(
    [{'host': elkhost, 'port': 443, 'scheme': 'https'}],
    headers = {'content-type': 'application/json'}
)

def find_patern_in_text(find_pattern, message):
    search_patern_result = re.findall(find_pattern, message)
    if search_patern_result:
        return (search_patern_result)
    return None

def hide_text(pattern, message):
    escaped_pattern = re.escape(pattern)
    modified_message = re.sub(escaped_pattern, "<HIDDEN>", message)
    return modified_message

def update_document(index_name, doc_id_update, body):
    try:
        result = es.update(index=index_name, id=doc_id_update, body={
            "doc": body
        })
        print(result)
    except ElasticsearchException as e:
        print("Failed to update document:", e)

def remove_and_reindex_document(index_name, doc_id, doc):
    try:
        es.index(index=index_name, id=doc_id, body=doc)
        print(f"Successfully reindexed document with ID {doc_id}")
    except ElasticsearchException as e:
        print("Failed to reindex document:", e)

def search_update_field():
    ##Initial seaarch
    countdocument = 0
    countfindpatern = 0
    replaced = 0
    query = {
        "query": {
            "match_all": {}
        },
        "sort": [
            {"@timestamp": {"order": "asc"}}
        ],
        "size": 1
    }
    response = es.search(index=indexname, body=query)
    hits = response["hits"]["hits"]
    
    ##Pagination
    while hits:
        last_sort = hits[-1]["sort"]
        query["search_after"] = last_sort
        query["size"] = elkhits
    
        try:
            response = es.search(index=indexname, body=query)
        except ElasticsearchException as e:
            print("Error:", e)
            time.sleep(2)    
    
        hits = response["hits"]["hits"]
        for hit in hits:
            doc_id = hit['_id']
            doc = hit['_source']
            print(doc_id, doc['@timestamp'])
            #sys.exit()
            modify_doc = False
            for key in doc.keys():
                #print(doc[key])
                for pattern in patterns:
                    #print(key, doc[key])
                    find_patern_resutlts = find_patern_in_text(pattern, str(doc[key]))
                    if find_patern_resutlts:
                        print(pattern)
                        for find_patern_resutlt in find_patern_resutlts:
                            countfindpatern += 1
                            if find_patern_resutlt != "<HIDDEN>":
                                print(find_patern_resutlt)
                                doc[key] = hide_text(find_patern_resutlt, doc[key])
                                modify_doc = True
                                replaced += 1

            keys_to_remove = []
            remove_field = False
            for key in doc.keys():
                if key.startswith("body") or key.startswith("headers"):
                    keys_to_remove.append(key)
                    remove_field = True       
            
            if remove_field:
                print(doc)
                for key in keys_to_remove:
                    del doc[key]
                    replaced += 1
                print(doc)
                remove_and_reindex_document(indexname, doc_id, doc)
                #sys.exit()
            
            if modify_doc:
                print('+'*50)
                print(doc)
                update_document(indexname, doc_id, doc)
                #sys.exit()
    
            countdocument += 1
        
        print("Count of Documents = ", countdocument)
        print('Total find paterns =', countfindpatern)
        print('Total replaced =', replaced)


search_update_field()
