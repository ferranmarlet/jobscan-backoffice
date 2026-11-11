variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Project name, used for naming and tagging resources"
  type        = string
  default     = "jobscan-backoffice"
}

variable "environment" {
  description = "Environment name, which must match the API stack's environment"
  type        = string
  default     = "dev"
}

variable "api_project_name" {
  description = "Project name of the API stack, used to find its security group"
  type        = string
  default     = "jobscan"
}

variable "api_state_path" {
  description = "Path to the API stack's Terraform state file"
  type        = string
  default     = "../../jobscan/terraform/terraform.tfstate"
}

variable "api_port" {
  description = "Port the API listens on"
  type        = number
  default     = 8080
}

variable "cognito_mfa_configuration" {
  description = "MFA mode of the user pool: OFF, OPTIONAL or ON"
  type        = string
  default     = "OPTIONAL"

  validation {
    condition     = contains(["OFF", "OPTIONAL", "ON"], var.cognito_mfa_configuration)
    error_message = "Must be OFF, OPTIONAL or ON."
  }
}

variable "cognito_extra_redirect_urls" {
  description = "Extra callback/logout URLs for the SPA client, e.g. the local dev server"
  type        = list(string)
  default     = ["http://localhost:5173/"]
}
