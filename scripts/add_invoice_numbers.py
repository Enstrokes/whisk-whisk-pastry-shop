# Script to add sequential invoiceNumber to all existing invoices in MongoDB
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "whisk_and_whisk_db"
COLLECTION = "invoices"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION]

# Fetch all invoices sorted by creation order (_id)
invoices = list(collection.find().sort("_id", 1))

for idx, invoice in enumerate(invoices, start=1):
    invoice_number = f"WHISK-{idx:02d}"
    collection.update_one({"_id": invoice["_id"]}, {"$set": {"invoiceNumber": invoice_number}})
    print(f"Updated invoice {_id} with invoiceNumber {invoice_number}")

print("All invoices updated with invoiceNumber.")
