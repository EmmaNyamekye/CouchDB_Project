import couchdb

# Connect to the CouchDB server
server = couchdb.Server('http://admin:hello123@localhost:5984/')

# Create or get a database
db_name = 'library'
if db_name in server:
    db = server[db_name]
else:
    db = server.create(db_name)

# Add a test document
doc_id, doc_rev = db.save({'type': 'Book', 'title': '1984', 'author': 'George Orwell'})

# GET request: retrieve the document
doc = db[doc_id]
print(doc)
