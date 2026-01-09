#!/bin/bash

# SMERP AWS CloudFormation 배포 스크립트

set -e

# 설정
STACK_NAME="${1:-smerp-dev}"
ENVIRONMENT="${2:-dev}"
REGION="${AWS_REGION:-ap-northeast-2}"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== SMERP CloudFormation 배포 ===${NC}"
echo "Stack Name: $STACK_NAME"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo ""

# AWS CLI 확인
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI가 설치되어 있지 않습니다.${NC}"
    echo "설치: brew install awscli"
    exit 1
fi

# AWS 자격 증명 확인
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS 자격 증명이 설정되지 않았습니다.${NC}"
    echo "설정: aws configure"
    exit 1
fi

echo -e "${YELLOW}AWS 계정 정보:${NC}"
aws sts get-caller-identity

echo ""
echo -e "${YELLOW}DB 비밀번호를 입력하세요 (최소 8자):${NC}"
read -s DB_PASSWORD
echo ""

if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo -e "${RED}비밀번호는 최소 8자 이상이어야 합니다.${NC}"
    exit 1
fi

# 스택 존재 여부 확인
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" 2>&1 || true)

if echo "$STACK_EXISTS" | grep -q "does not exist"; then
    echo -e "${GREEN}새 스택을 생성합니다...${NC}"
    ACTION="create-stack"
    WAIT_ACTION="stack-create-complete"
else
    echo -e "${YELLOW}기존 스택을 업데이트합니다...${NC}"
    ACTION="update-stack"
    WAIT_ACTION="stack-update-complete"
fi

# CloudFormation 배포
aws cloudformation $ACTION \
    --stack-name "$STACK_NAME" \
    --template-body file://aws/cloudformation.yaml \
    --parameters \
        ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
        ParameterKey=DBPassword,ParameterValue="$DB_PASSWORD" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION" \
    --tags Key=Project,Value=SMERP Key=Environment,Value="$ENVIRONMENT"

echo -e "${YELLOW}배포 중... (5-10분 소요)${NC}"
aws cloudformation wait $WAIT_ACTION --stack-name "$STACK_NAME" --region "$REGION"

echo -e "${GREEN}=== 배포 완료! ===${NC}"
echo ""

# Outputs 가져오기
echo -e "${YELLOW}스택 출력값:${NC}"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# .env 업데이트 안내
echo ""
echo -e "${GREEN}=== .env 파일 업데이트 ===${NC}"
echo ""

RDS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
    --output text)

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
    --output text)

ACCESS_KEY=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`AWSAccessKeyId`].OutputValue' \
    --output text)

SECRET_KEY=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`AWSSecretAccessKey`].OutputValue' \
    --output text)

echo "다음 내용을 .env 파일에 추가하세요:"
echo ""
echo "DATABASE_URL=\"postgresql://smerp_admin:YOUR_PASSWORD@${RDS_ENDPOINT}:5432/smerp\""
echo ""
echo "AWS_ACCESS_KEY_ID=\"${ACCESS_KEY}\""
echo "AWS_SECRET_ACCESS_KEY=\"${SECRET_KEY}\""
echo "AWS_REGION=\"${REGION}\""
echo "S3_BUCKET_NAME=\"${S3_BUCKET}\""
