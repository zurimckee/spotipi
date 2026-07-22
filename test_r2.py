from dotenv import load_dotenv
load_dotenv()

import os
import boto3

s3 = boto3.client(
    "s3",
    endpoint_url=os.environ["R2_ENDPOINT_URL"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto",
)

response = s3.list_objects_v2(Bucket=os.environ["R2_BUCKET"])
for obj in response.get("Contents", []):
    print(obj["Key"], obj["Size"])